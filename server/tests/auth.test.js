/**
 * Test unitaire & d'intégration : Module Authentification Hexagonal Kinimmo
 * 
 * Exécute la suite de tests avec l'outillage standard de Node.js (node:test, node:assert)
 * sans ajouter de dépendance superflue.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const User = require('../src/core/domain/user/User');
const RegisterUserUseCase = require('../src/application/use-cases/auth/RegisterUserUseCase');
const LoginUserUseCase = require('../src/application/use-cases/auth/LoginUserUseCase');
const GetMeUseCase = require('../src/application/use-cases/auth/GetMeUseCase');
const BcryptPasswordHasher = require('../src/infrastructure/security/BcryptPasswordHasher');
const JwtTokenService = require('../src/infrastructure/security/JwtTokenService');

// Faux Repository en mémoire respectant le contrat IUserRepository
class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
  }

  async findById(id) {
    const user = this.users.get(String(id));
    return user || null;
  }

  async findByEmail(email) {
    const clean = String(email).toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === clean) {
        return user;
      }
    }
    return null;
  }

  async create(user) {
    const id = user.id || `user_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const createdUser = new User({
      ...user,
      id
    });
    this.users.set(id, createdUser);
    return createdUser;
  }

  async update(user) {
    this.users.set(String(user.id), user);
    return user;
  }
}

describe('Domain - User Entity', () => {
  it('doit instancier un utilisateur valide', () => {
    const user = new User({
      name: 'Jean Bakala',
      email: 'jean.bakala@kinimmo.cd',
      role: 'agent',
      phone: '+243810000000'
    });

    assert.equal(user.name, 'Jean Bakala');
    assert.equal(user.email, 'jean.bakala@kinimmo.cd');
    assert.equal(user.role, 'agent');
    assert.equal(user.status, 'active');
  });

  it('doit refuser un rôle invalide', () => {
    assert.throws(() => {
      new User({
        name: 'Invalide User',
        email: 'test@kinimmo.cd',
        role: 'hacker_role'
      });
    }, /Rôle invalide/);
  });

  it('doit assainir les rôles publics et refuser l élévation admin', () => {
    assert.equal(User.sanitizeRegistrationRole(null), 'user');
    assert.equal(User.sanitizeRegistrationRole('agent'), 'agent');
    assert.equal(User.sanitizeRegistrationRole('agency'), 'agency');

    assert.throws(() => {
      User.sanitizeRegistrationRole('admin');
    }, /pas autorisé pour une inscription publique/);

    assert.throws(() => {
      User.sanitizeRegistrationRole('super_admin');
    }, /pas autorisé pour une inscription publique/);
  });

  it('ne doit jamais inclure password_hash dans toSafeObject()', () => {
    const user = new User({
      id: 'usr_1',
      name: 'Agent Kinshasa',
      email: 'agent@kinimmo.cd',
      password_hash: '$2a$10$hashed_secret_value',
      role: 'agent'
    });

    const safe = user.toSafeObject();
    assert.equal(safe.password_hash, undefined);
    assert.equal(safe.id, 'usr_1');
    assert.equal(safe.name, 'Agent Kinshasa');
  });
});

describe('Infrastructure - Hasher & Token Services', () => {
  const hasher = new BcryptPasswordHasher(4); // 4 rounds pour tests rapides
  const tokenService = new JwtTokenService('test_secret_key_123', '1h');

  it('doit hacher et vérifier un mot de passe', async () => {
    const raw = 'Kinshasa2026!';
    const hash = await hasher.hash(raw);
    assert.notEqual(hash, raw);

    const matches = await hasher.compare(raw, hash);
    assert.equal(matches, true);

    const wrongMatches = await hasher.compare('MauvaisMotDePasse', hash);
    assert.equal(wrongMatches, false);
  });

  it('doit signer et vérifier un token JWT', () => {
    const payload = { id: 'usr_test_1', email: 'test@kinimmo.cd', role: 'agency' };
    const token = tokenService.generateToken(payload);
    assert.ok(token);

    const decoded = tokenService.verifyToken(token);
    assert.equal(decoded.id, 'usr_test_1');
    assert.equal(decoded.email, 'test@kinimmo.cd');
    assert.equal(decoded.role, 'agency');
  });
});

describe('Application - Auth Use Cases', () => {
  const userRepo = new InMemoryUserRepository();
  const hasher = new BcryptPasswordHasher(4);
  const tokenService = new JwtTokenService('test_secret_key_123', '1h');

  const registerUseCase = new RegisterUserUseCase({
    userRepository: userRepo,
    passwordHasher: hasher,
    tokenService
  });

  const loginUseCase = new LoginUserUseCase({
    userRepository: userRepo,
    passwordHasher: hasher,
    tokenService
  });

  const getMeUseCase = new GetMeUseCase({
    userRepository: userRepo,
    pool: null
  });

  it('doit inscrire un utilisateur avec des données valides', async () => {
    const res = await registerUseCase.execute({
      name: 'Mukendi Claude',
      email: 'claude.mukendi@kinimmo.cd',
      password: 'password123',
      role: 'agent',
      phone: '+243990000000'
    });

    assert.ok(res.token);
    assert.ok(res.user.id);
    assert.equal(res.user.name, 'Mukendi Claude');
    assert.equal(res.user.email, 'claude.mukendi@kinimmo.cd');
    assert.equal(res.user.role, 'agent');
    assert.equal(res.user.password_hash, undefined);
  });

  it('doit refuser une adresse e-mail déjà utilisée', async () => {
    await assert.rejects(
      async () => {
        await registerUseCase.execute({
          name: 'Double Inscription',
          email: 'claude.mukendi@kinimmo.cd',
          password: 'password123'
        });
      },
      (err) => {
        assert.equal(err.code, 'EMAIL_ALREADY_EXISTS');
        return true;
      }
    );
  });

  it('doit authentifier un utilisateur avec le bon mot de passe', async () => {
    const res = await loginUseCase.execute({
      email: 'claude.mukendi@kinimmo.cd',
      password: 'password123'
    });

    assert.ok(res.token);
    assert.equal(res.user.email, 'claude.mukendi@kinimmo.cd');
    assert.equal(res.user.password_hash, undefined);
  });

  it('doit refuser l authentification avec un mot de passe incorrect', async () => {
    await assert.rejects(
      async () => {
        await loginUseCase.execute({
          email: 'claude.mukendi@kinimmo.cd',
          password: 'faux_mot_de_passe'
        });
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });

  it('doit récupérer le profil avec GetMeUseCase', async () => {
    const foundUser = await userRepo.findByEmail('claude.mukendi@kinimmo.cd');
    const profile = await getMeUseCase.execute(foundUser.id);

    assert.equal(profile.id, foundUser.id);
    assert.equal(profile.name, 'Mukendi Claude');
    assert.equal(profile.password_hash, undefined);
  });
});

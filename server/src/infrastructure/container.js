/**
 * Conteneur d'Injection de Dépendances (Composition Root)
 * 
 * Assemble les adaptateurs d'infrastructure et les cas d'utilisation
 * de manière centralisée, découplée et testable.
 */

const pool = require('../config/database');

// Repositories & Adapters
const MySqlUserRepository = require('./database/mysql/repositories/MySqlUserRepository');
const BcryptPasswordHasher = require('./security/BcryptPasswordHasher');
const JwtTokenService = require('./security/JwtTokenService');

// Use Cases
const RegisterUserUseCase = require('../application/use-cases/auth/RegisterUserUseCase');
const LoginUserUseCase = require('../application/use-cases/auth/LoginUserUseCase');
const GetMeUseCase = require('../application/use-cases/auth/GetMeUseCase');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'kinimmo_jwt_secret_default_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15d';

// 1. Instanciation des adaptateurs d'infrastructure
const userRepository = new MySqlUserRepository(pool);
const passwordHasher = new BcryptPasswordHasher(10);
const tokenService = new JwtTokenService(JWT_SECRET, JWT_EXPIRES_IN);

// 2. Instanciation des cas d'utilisation avec injection des dépendances
const registerUserUseCase = new RegisterUserUseCase({
  userRepository,
  passwordHasher,
  tokenService
});

const loginUserUseCase = new LoginUserUseCase({
  userRepository,
  passwordHasher,
  tokenService
});

const getMeUseCase = new GetMeUseCase({
  userRepository,
  pool
});

module.exports = {
  // Infrastructure
  pool,
  userRepository,
  passwordHasher,
  tokenService,

  // Use Cases
  registerUserUseCase,
  loginUserUseCase,
  getMeUseCase
};

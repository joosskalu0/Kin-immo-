import React, { useState } from 'react';
import { Calculator, Euro, Percent, Calendar, DollarSign } from 'lucide-react';
import { convertAndFormatPrice } from '../utils/currency';
import { useApp } from '../context/AppContext';

interface MortgageCalculatorProps {
  initialPrice?: number;
}

export const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({ initialPrice = 500000 }) => {
  const { currency } = useApp();
  const [propertyPrice, setPropertyPrice] = useState(initialPrice);
  const [downPayment, setDownPayment] = useState(Math.round(initialPrice * 0.2));
  const [interestRate, setInterestRate] = useState(3.4);
  const [loanTerm, setLoanTerm] = useState(20); // Years

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;

  const monthlyPayment =
    loanAmount > 0 && monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
      : loanAmount / (numberOfPayments || 1);

  const totalPayment = monthlyPayment * numberOfPayments;
  const totalInterest = Math.max(0, totalPayment - loanAmount);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 text-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Calculateur de Prêt Immobilier</h3>
          <p className="text-xs text-slate-400">Estimez vos mensualités et le coût de votre emprunt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sliders Form */}
        <div className="space-y-4 text-xs">
          {/* Price */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Prix du Bien</span>
              <span className="text-emerald-400 font-bold">{convertAndFormatPrice(propertyPrice, currency)}</span>
            </div>
            <input
              type="range"
              min={50000}
              max={5000000}
              step={10000}
              value={propertyPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPropertyPrice(val);
                setDownPayment(Math.round(val * 0.2));
              }}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Down Payment */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Apport Personnel</span>
              <span className="text-emerald-400 font-bold">{convertAndFormatPrice(downPayment, currency)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={propertyPrice}
              step={5000}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Taux d'Intérêt Annuel</span>
              <span className="text-emerald-400 font-bold">{interestRate}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10.0}
              step={0.1}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Term */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Durée du Prêt</span>
              <span className="text-emerald-400 font-bold">{loanTerm} ans</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={loanTerm}
              onChange={(e) => setLoanTerm(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Calculation Result Card */}
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Mensualité estimée</span>
            <div className="text-3xl font-extrabold text-emerald-400">
              {convertAndFormatPrice(Math.round(monthlyPayment), currency)} <span className="text-xs font-semibold text-slate-400">/mois</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Capital Emprunté:</span>
              <span className="font-bold text-white">{convertAndFormatPrice(loanAmount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total des Intérêts:</span>
              <span className="font-bold text-amber-400">{convertAndFormatPrice(Math.round(totalInterest), currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Coût Total du Crédit:</span>
              <span className="font-bold text-slate-200">{convertAndFormatPrice(Math.round(totalPayment), currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

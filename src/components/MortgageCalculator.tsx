import React, { useState } from 'react';
import { Calculator, Euro, Percent, Calendar, DollarSign } from 'lucide-react';
import { convertAndFormatPrice } from '../utils/currency';
import { useApp } from '../context/AppContext';

interface MortgageCalculatorProps {
  initialPrice?: number;
}

export const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({ initialPrice = 500000 }) => {
  const { currency } = useApp();
  const safeInitialPrice = typeof initialPrice === 'number' && !isNaN(initialPrice) && initialPrice > 0 ? initialPrice : 500000;
  const [propertyPrice, setPropertyPrice] = useState(safeInitialPrice);
  const [downPayment, setDownPayment] = useState(Math.round(safeInitialPrice * 0.2));
  const [interestRate, setInterestRate] = useState(3.4);
  const [loanTerm, setLoanTerm] = useState(20); // Years

  const safePropertyPrice = isNaN(propertyPrice) ? 500000 : propertyPrice;
  const safeDownPayment = isNaN(downPayment) ? 0 : downPayment;
  const safeInterestRate = isNaN(interestRate) ? 3.4 : interestRate;
  const safeLoanTerm = isNaN(loanTerm) ? 20 : loanTerm;

  const loanAmount = Math.max(0, safePropertyPrice - safeDownPayment);
  const monthlyRate = safeInterestRate / 100 / 12;
  const numberOfPayments = safeLoanTerm * 12;

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
              <span className="text-emerald-400 font-bold">{convertAndFormatPrice(safePropertyPrice, currency)}</span>
            </div>
            <input
              type="range"
              min={50000}
              max={5000000}
              step={10000}
              value={safePropertyPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                const safeVal = isNaN(val) ? 500000 : val;
                setPropertyPrice(safeVal);
                setDownPayment(Math.round(safeVal * 0.2));
              }}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Down Payment */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Apport Personnel</span>
              <span className="text-emerald-400 font-bold">{convertAndFormatPrice(safeDownPayment, currency)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(safePropertyPrice, 50000)}
              step={5000}
              value={safeDownPayment}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDownPayment(isNaN(val) ? 0 : val);
              }}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Taux d'Intérêt Annuel</span>
              <span className="text-emerald-400 font-bold">{safeInterestRate}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10.0}
              step={0.1}
              value={safeInterestRate}
              onChange={(e) => {
                const val = Number(e.target.value);
                setInterestRate(isNaN(val) ? 3.4 : val);
              }}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Term */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-300">Durée du Prêt</span>
              <span className="text-emerald-400 font-bold">{safeLoanTerm} ans</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={safeLoanTerm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLoanTerm(isNaN(val) ? 20 : val);
              }}
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

import React, { useState } from 'react';
import { User, ShieldCheck, Database, RotateCcw, Check, X, Calendar, Wallet, Sliders, Bell, BarChart3, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../types/finance.ts';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  onResetToDefaults: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onResetToDefaults,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync formData when modal opens or profile changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData(profile);
      setSavedSuccess(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    if (window.confirm('Сбросить стартовый баланс, дату отсчета и список правил к заводским тестовым данным?')) {
      onResetToDefaults();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Параметры профиля пользователя
                <span className="text-[10px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30 font-normal">
                  ID: {profile.id}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Section: Financial Radar Defaults */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <Sliders size={14} className="text-blue-600" />
              <span>Базовые параметры финансового радара</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Initial Balance */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Wallet size={14} className="text-slate-400" />
                  Текущий баланс на счетах (₽)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    required
                    value={formData.initialBalance}
                    onChange={(e) =>
                      setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">₽</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Фактический остаток на начало периода
                </span>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  Дата отсчета прогноза ("Старт")
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Точка старта развертки календаря
                </span>
              </div>
            </div>

            {/* Default Horizon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Глубина прогноза по умолчанию
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFormData({ ...formData, period: days as any })}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center ${
                      formData.period === days
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{days} дней</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {days === 30 ? '1 мес' : days === 60 ? '2 мес' : days === 90 ? '3 мес' : 'полгода'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Safety Buffer */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Неснижаемый остаток / Подушка ликвидности (₽)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  value={formData.safetyBuffer}
                  onChange={(e) =>
                    setFormData({ ...formData, safetyBuffer: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">₽</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Буфер безопасности для упреждающего предупреждения о кассовом разрыве
              </span>
            </div>
          </div>

          {/* Section: Display and Chart Settings */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              <BarChart3 size={14} className="text-blue-600" />
              <span>Параметры отображения графика и интерфейса</span>
            </div>

            <div className="space-y-2.5">
              {/* Toggle 1: Chart Auto-Compact */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableChartCollapse !== false}
                  onChange={(e) =>
                    setFormData({ ...formData, enableChartCollapse: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>Минимизировать график при развороте правил</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      {formData.enableChartCollapse !== false ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    При развороте блока финансовых правил график автоматически переходит в компактный вид, а при сворачивании возвращается к полному размеру.
                  </div>
                </div>
              </label>

              {/* Toggle 2: Compact Chart Tooltip */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showCompactTooltip === true}
                  onChange={(e) =>
                    setFormData({ ...formData, showCompactTooltip: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>Показывать карточку-тултип на компактном графике</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      {formData.showCompactTooltip === true ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Отображать темную всплывающую карточку при наведении на компактный график. Рекомендуется отключить, если правила уже подсвечиваются и поднимаются в таблице ниже.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Database Persistence Explanation */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Database size={15} className="text-blue-600" />
              <span>Архитектура хранения параметров профиля</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              В боевой конфигурации PYM эти параметры закреплены за <code className="bg-slate-200 px-1 rounded text-slate-700 font-mono">user_id</code> в таблице <code className="bg-slate-200 px-1 rounded text-slate-700 font-mono">finance_schema.user_profiles</code> (PostgreSQL) и синхронизируются через Data-Service (:9801). В приложении они автоматически сохраняются в персональном хранилище браузера (localStorage) и восстанавливаются при каждом входе.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition cursor-pointer font-medium"
              title="Сбросить все настройки и восстановить стартовые данные с несколькими операциями на дни зарплаты"
            >
              <RotateCcw size={14} />
              <span>Сбросить к исходным</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white transition shadow-xs cursor-pointer ${
                  savedSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check size={15} />
                    <span>Сохранено!</span>
                  </>
                ) : (
                  <span>Сохранить в профиль</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

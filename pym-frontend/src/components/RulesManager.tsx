import React, { useState, useMemo } from 'react';
import {
  TransactionRule,
  TransactionType,
  DailyPoint,
  Counterparty,
  CounterpartyType,
} from '../types/finance.ts';
import {
  isRuleArchived,
  formatRecurrenceLabel,
  formatCategoryLabel,
} from '../engine/forecast.ts';
import { RuleModal } from './RuleModal.tsx';

interface RulesManagerProps {
  rules: TransactionRule[];
  onAddRule: (rule: Omit<TransactionRule, 'id'>) => void;
  onUpdateRule?: (rule: TransactionRule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  activeHoverPoint?: DailyPoint | null;
  isOpenModal?: boolean;
  onOpenModalChange?: (open: boolean) => void;
  prefillData?: { date?: string; type?: TransactionType; title?: string } | null;
  hoveredRuleId?: string | null;
  onHoverRuleChange?: (ruleId: string | null) => void;
  defaultDate?: string;
  forecastStartDate?: string;
  forecastEndDate?: string;
  isFullPage?: boolean;
  counterparties?: Counterparty[];
  onAddCounterparty?: (cp: Omit<Counterparty, 'id'>) => Counterparty;
  onUpdateCounterparty?: (cp: Counterparty) => void;
  onDeleteCounterparty?: (id: string) => void;
}

const formatCounterpartyType = (t: CounterpartyType): string => {
  switch (t) {
    case 'CLIENT':
      return 'Заказчик / Плательщик';
    case 'VENDOR':
      return 'Поставщик / Подрядчик';
    case 'BANK':
      return 'Банк / Эквайринг';
    case 'TAX':
      return 'Госорган / ФНС';
    case 'INTERNAL':
      return 'Внутренний реестр';
    default:
      return t;
  }
};

export const RulesManager: React.FC<RulesManagerProps> = ({
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  activeHoverPoint,
  isOpenModal = false,
  onOpenModalChange,
  prefillData,
  hoveredRuleId,
  onHoverRuleChange,
  defaultDate = '2026-10-24',
  forecastStartDate = '2026-10-24',
  forecastEndDate,
  isFullPage = false,
  counterparties = [],
  onAddCounterparty,
  onUpdateCounterparty,
  onDeleteCounterparty,
}) => {
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TransactionRule | null>(null);

  const [subTab, setSubTab] = useState<'rules' | 'counterparties'>('rules');
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  const [isAddingCp, setIsAddingCp] = useState(false);
  const [editingCp, setEditingCp] = useState<Counterparty | null>(null);
  const [cpName, setCpName] = useState('');
  const [cpInn, setCpInn] = useState('');
  const [cpType, setCpType] = useState<CounterpartyType>('VENDOR');
  const [cpContract, setCpContract] = useState('');
  const [cpAccount, setCpAccount] = useState('');

  const showModal = isOpenModal || localModalOpen;
  const setShowModal = (open: boolean) => {
    setLocalModalOpen(open);
    if (onOpenModalChange) onOpenModalChange(open);
    if (!open) {
      setEditingRule(null);
    }
  };

  React.useEffect(() => {
    if (prefillData && !editingRule) {
      setLocalModalOpen(true);
    }
  }, [prefillData, editingRule]);

  const handleOpenAddModal = () => {
    setEditingRule(null);
    setShowModal(true);
  };

  const handleStartEdit = (rule: TransactionRule) => {
    setEditingRule(rule);
    setShowModal(true);
  };

  const handleSaveFromModal = (ruleData: Omit<TransactionRule, 'id'>, existingId?: string) => {
    if (existingId && onUpdateRule) {
      onUpdateRule({ ...ruleData, id: existingId });
    } else {
      onAddRule(ruleData);
    }
    setEditingRule(null);
    setShowModal(false);
  };

  const archivedCount = useMemo(() => {
    return rules.filter((r) => isRuleArchived(r, forecastStartDate)).length;
  }, [rules, forecastStartDate]);

  const activeHoverRuleIds = useMemo(() => {
    if (!activeHoverPoint || !activeHoverPoint.transactions) return new Set<string>();
    return new Set(activeHoverPoint.transactions.map((tx) => tx.ruleId));
  }, [activeHoverPoint]);

  const displayedRules = useMemo(() => {
    const filtered = rules.filter((rule) => {
      const archived = isRuleArchived(rule, forecastStartDate);
      if (!isFullPage && archived) return false;
      if (isFullPage && !showArchived && archived) return false;

      if (isFullPage && flowFilter !== 'ALL' && rule.type !== flowFilter) {
        return false;
      }

      if (isFullPage && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rule.title.toLowerCase().includes(q);
        const matchCp = (rule.counterpartyName || '').toLowerCase().includes(q);
        const matchInn = (rule.counterpartyInn || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCp && !matchInn) return false;
      }

      return true;
    });

    if (isFullPage && showArchived) {
      return [...filtered].sort((a, b) => {
        const archA = isRuleArchived(a, forecastStartDate) ? 1 : 0;
        const archB = isRuleArchived(b, forecastStartDate) ? 1 : 0;
        return archA - archB;
      });
    }
    return filtered;
  }, [rules, forecastStartDate, isFullPage, showArchived, flowFilter, searchQuery]);

  const activeNonArchivedCount = useMemo(
    () => rules.filter((r) => !isRuleArchived(r, forecastStartDate)).length,
    [rules, forecastStartDate]
  );

  const handleStartAddCp = () => {
    setEditingCp(null);
    setCpName('');
    setCpInn('');
    setCpType('VENDOR');
    setCpContract('');
    setCpAccount('');
    setIsAddingCp(true);
  };

  const handleStartEditCp = (cp: Counterparty) => {
    setEditingCp(cp);
    setCpName(cp.name);
    setCpInn(cp.inn || '');
    setCpType(cp.type);
    setCpContract(cp.contract || '');
    setCpAccount(cp.accountNumber || '');
    setIsAddingCp(true);
  };

  const handleSaveCp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim()) return;
    if (editingCp && onUpdateCounterparty) {
      onUpdateCounterparty({
        ...editingCp,
        name: cpName.trim(),
        inn: cpInn.trim() || undefined,
        type: cpType,
        contract: cpContract.trim() || undefined,
        accountNumber: cpAccount.trim() || undefined,
      });
    } else if (onAddCounterparty) {
      onAddCounterparty({
        name: cpName.trim(),
        inn: cpInn.trim() || undefined,
        type: cpType,
        contract: cpContract.trim() || undefined,
        accountNumber: cpAccount.trim() || undefined,
      });
    }
    setIsAddingCp(false);
    setEditingCp(null);
  };

  return (
    <div className="bg-white border border-gray-400">
      {/* верхняя панель с кнопками */}
      <div className="px-3 py-2 bg-[#f5f5f5] border-b border-gray-400 flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {isFullPage ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSubTab('rules')}
                className={`px-3 py-1 border text-xs font-bold cursor-pointer ${
                  subTab === 'rules'
                    ? 'bg-[#337ab7] text-white border-[#204d74]'
                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-100'
                }`}
              >
                Реестр правил и транзакций ({activeNonArchivedCount})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('counterparties')}
                className={`px-3 py-1 border text-xs font-bold cursor-pointer ${
                  subTab === 'counterparties'
                    ? 'bg-[#337ab7] text-white border-[#204d74]'
                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-100'
                }`}
              >
                Справочник контрагентов ({counterparties.length})
              </button>
            </div>
          ) : (
            <div className="font-bold text-gray-800 text-xs sm:text-sm">
              Действующие финансовые правила и обязательства (записей: {activeNonArchivedCount})
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* галочка показать архив */}
          {isFullPage && subTab === 'rules' && (
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-400 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="cursor-pointer"
              />
              <span>Показать архив ({archivedCount})</span>
            </label>
          )}

          {subTab === 'rules' ? (
            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1 bg-[#337ab7] hover:bg-[#286090] border border-[#204d74] text-white text-xs font-bold cursor-pointer"
            >
              + Добавить операцию
            </button>
          ) : (
            <button
              onClick={handleStartAddCp}
              className="px-3 py-1 bg-[#337ab7] hover:bg-[#286090] border border-[#204d74] text-white text-xs font-bold cursor-pointer"
            >
              + Добавить контрагента
            </button>
          )}
        </div>
      </div>

      {/* поиск и фильтр по типу */}
      {isFullPage && subTab === 'rules' && (
        <div className="p-2.5 bg-gray-50 border-b border-gray-300 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
            <span className="font-bold text-gray-700">Поиск:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Назначение, контрагент, ИНН..."
              className="w-full px-2 py-1 bg-white border border-gray-400 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-600 mr-1">Фильтр:</span>
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFlowFilter(f)}
                className={`px-2.5 py-1 border text-xs cursor-pointer ${
                  flowFilter === f
                    ? 'bg-gray-700 text-white border-gray-800 font-bold'
                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-100'
                }`}
              >
                {f === 'ALL' ? 'Все' : f === 'INCOME' ? 'Приход (+)' : 'Списание (-)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* таблица правил */}
      {subTab === 'rules' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#eeeeee] text-gray-800 font-bold border-b border-gray-400">
                <th className="w-10 p-2 text-center border-r border-gray-300">Вкл</th>
                <th className="p-2 border-r border-gray-300">Назначение операции</th>
                <th className="p-2 border-r border-gray-300">Контрагент / Счет</th>
                <th className="p-2 border-r border-gray-300">Сумма (руб.)</th>
                <th className="p-2 border-r border-gray-300">Периодичность / Дата</th>
                <th className="p-2 border-r border-gray-300">Статья ДДС</th>
                <th className="p-2 text-center">Действия</th>
              </tr>
            </thead>
            <tbody>
              {displayedRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    Записи не найдены.
                  </td>
                </tr>
              ) : (
                displayedRules.map((rule) => {
                  const isExpense = rule.type === 'EXPENSE';
                  const archived = isRuleArchived(rule, forecastStartDate);
                  const isPointHovered = activeHoverRuleIds.has(rule.id);
                  const isRuleHovered = hoveredRuleId === rule.id;

                  let rowBg = 'bg-white hover:bg-gray-50';
                  if (archived) {
                    rowBg = 'bg-[#e2e3e5] text-gray-500';
                  } else if (isPointHovered || isRuleHovered) {
                    rowBg = 'bg-[#d9edf7]';
                  } else if (!rule.active) {
                    rowBg = 'bg-gray-100 text-gray-400';
                  }

                  return (
                    <tr
                      key={rule.id}
                      onMouseEnter={() => !archived && onHoverRuleChange?.(rule.id)}
                      onMouseLeave={() => onHoverRuleChange?.(null)}
                      className={`border-b border-gray-300 ${rowBg}`}
                    >
                      <td className="p-2 text-center border-r border-gray-300">
                        <input
                          type="checkbox"
                          checked={rule.active && !archived}
                          disabled={archived}
                          onChange={() => onToggleRule(rule.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-2 border-r border-gray-300">
                        <span className={archived ? 'line-through text-gray-500' : 'font-medium text-gray-900'}>
                          {rule.title}
                        </span>
                        {archived && (
                          <span className="ml-2 px-1.5 py-0.5 bg-gray-400 text-white text-[10px] font-bold uppercase">
                            архив
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-gray-300">
                        <div>
                          {rule.counterpartyName ? (
                            <span>
                              {rule.counterpartyName}
                              {rule.counterpartyInn ? ` (ИНН ${rule.counterpartyInn})` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                        {rule.accountName && (
                          <div className="text-[11px] text-gray-500">{rule.accountName}</div>
                        )}
                      </td>
                      <td className="p-2 border-r border-gray-300 font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            archived
                              ? 'text-gray-500'
                              : isExpense
                              ? 'text-[#a94442]'
                              : 'text-[#3c763d]'
                          }
                        >
                          {isExpense ? '-' : '+'}
                          {rule.amount.toLocaleString('ru-RU')} ₽
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-300 whitespace-nowrap">
                        <div>{formatRecurrenceLabel(rule)}</div>
                        {rule.recurrence === 'RECURRING' && (rule.startDate || rule.endDate) && (
                          <div className="text-[10px] text-gray-500">
                            {rule.startDate ? `с ${rule.startDate} ` : ''}
                            {rule.endDate ? `до ${rule.endDate}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border-r border-gray-300 whitespace-nowrap">
                        {formatCategoryLabel(rule.category)}
                      </td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleStartEdit(rule)}
                          className="px-2 py-0.5 mr-1 bg-gray-100 hover:bg-gray-200 border border-gray-400 text-gray-800 text-[11px] cursor-pointer"
                        >
                          Изм.
                        </button>
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="px-2 py-0.5 bg-[#f2dede] hover:bg-[#ebccd1] border border-[#ebccd1] text-[#a94442] text-[11px] cursor-pointer"
                        >
                          Удал.
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* вкладка со списком контрагентов */}
      {subTab === 'counterparties' && (
        <div className="p-3 space-y-3">
          {isAddingCp && (
            <form
              onSubmit={handleSaveCp}
              className="p-3 bg-gray-100 border border-gray-400 space-y-3 text-xs"
            >
              <div className="font-bold text-gray-800">
                {editingCp ? 'Редактирование контрагента' : 'Добавление контрагента в БД'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Наименование *:</label>
                  <input
                    type="text"
                    required
                    value={cpName}
                    onChange={(e) => setCpName(e.target.value)}
                    placeholder="ООО «Яндекс.Облако»"
                    className="w-full px-2 py-1 bg-white border border-gray-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ИНН:</label>
                  <input
                    type="text"
                    value={cpInn}
                    onChange={(e) => setCpInn(e.target.value)}
                    placeholder="7704357909"
                    className="w-full px-2 py-1 bg-white border border-gray-400 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Тип:</label>
                  <select
                    value={cpType}
                    onChange={(e) => setCpType(e.target.value as CounterpartyType)}
                    className="w-full px-2 py-1 bg-white border border-gray-400 text-xs"
                  >
                    <option value="VENDOR">Поставщик / Подрядчик</option>
                    <option value="CLIENT">Заказчик / Плательщик</option>
                    <option value="BANK">Банк / Эквайринг</option>
                    <option value="TAX">Госорган / ФНС</option>
                    <option value="INTERNAL">Внутренний реестр</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Договор:</label>
                  <input
                    type="text"
                    value={cpContract}
                    onChange={(e) => setCpContract(e.target.value)}
                    placeholder="Договор № 15 от 01.02.2026"
                    className="w-full px-2 py-1 bg-white border border-gray-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Расчетный счет:</label>
                  <input
                    type="text"
                    value={cpAccount}
                    onChange={(e) => setCpAccount(e.target.value)}
                    placeholder="40702810..."
                    className="w-full px-2 py-1 bg-white border border-gray-400 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCp(false)}
                  className="px-3 py-1 bg-white border border-gray-400 text-gray-700 text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#337ab7] text-white border border-[#204d74] text-xs font-bold cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-gray-400">
              <thead>
                <tr className="bg-[#eeeeee] text-gray-800 font-bold border-b border-gray-400">
                  <th className="p-2 border-r border-gray-300">Наименование контрагента</th>
                  <th className="p-2 border-r border-gray-300">ИНН</th>
                  <th className="p-2 border-r border-gray-300">Роль</th>
                  <th className="p-2 border-r border-gray-300">Договор</th>
                  <th className="p-2 border-r border-gray-300">Расчетный счет</th>
                  <th className="p-2 text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((cp) => (
                  <tr key={cp.id} className="border-b border-gray-300 hover:bg-gray-50">
                    <td className="p-2 border-r border-gray-300 font-bold text-gray-900">
                      {cp.name}
                    </td>
                    <td className="p-2 border-r border-gray-300 font-mono">{cp.inn || '—'}</td>
                    <td className="p-2 border-r border-gray-300">
                      {formatCounterpartyType(cp.type)}
                    </td>
                    <td className="p-2 border-r border-gray-300">{cp.contract || '—'}</td>
                    <td className="p-2 border-r border-gray-300 font-mono">
                      {cp.accountNumber || '—'}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleStartEditCp(cp)}
                        className="px-2 py-0.5 mr-1 bg-gray-100 hover:bg-gray-200 border border-gray-400 text-gray-800 text-[11px] cursor-pointer"
                      >
                        Изм.
                      </button>
                      {onDeleteCounterparty && (
                        <button
                          onClick={() => onDeleteCounterparty(cp.id)}
                          className="px-2 py-0.5 bg-[#f2dede] hover:bg-[#ebccd1] border border-[#ebccd1] text-[#a94442] text-[11px] cursor-pointer"
                        >
                          Удал.
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RuleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaveRule={handleSaveFromModal}
        editingRule={editingRule}
        prefillData={prefillData}
        defaultDate={defaultDate}
        forecastStartDate={forecastStartDate}
        forecastEndDate={forecastEndDate}
        counterparties={counterparties}
        onAddCounterparty={onAddCounterparty}
      />
    </div>
  );
};

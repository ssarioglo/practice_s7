import React, { useState } from 'react';
import { Counterparty, TransactionRule } from '../types/finance.ts';

interface ApiImportViewProps {
  rules: TransactionRule[];
  counterparties: Counterparty[];
  onImportPayload: (payload: {
    rules?: Omit<TransactionRule, 'id'>[];
    counterparties?: Omit<Counterparty, 'id'>[];
  }) => { addedRules: number; addedCounterparties: number };
}

const SAMPLE_JSON_PAYLOAD = JSON.stringify(
  {
    counterparties: [
      {
        name: 'ООО "Вектор-Логистик"',
        inn: '7714987654',
        type: 'VENDOR',
        contract: 'Договор доставки № 19 от 01.03.2026',
        accountNumber: '40702810900000004321',
      },
    ],
    rules: [
      {
        title: 'Оплата услуг доставки',
        amount: 320000,
        type: 'EXPENSE',
        recurrence: 'RECURRING',
        intervalType: 'BIWEEKLY',
        startDate: '2026-04-15',
        category: 'OPERATIONAL',
        source: 'FILE_IMPORT',
        accountName: 'Р/с ••4812 (СберБизнес — Основной)',
        counterpartyName: 'ООО "Вектор-Логистик"',
        counterpartyInn: '7714987654',
        active: true,
      },
      {
        title: 'Оплата от заказчика по акту № 84',
        amount: 1450000,
        type: 'INCOME',
        recurrence: 'ONCE',
        date: '2026-04-22',
        category: 'OPERATIONAL',
        source: 'FILE_IMPORT',
        accountName: 'Р/с ••4812 (СберБизнес — Основной)',
        counterpartyName: 'ООО "СтройКомплект"',
        counterpartyInn: '7701982341',
        active: true,
      },
    ],
  },
  null,
  2
);

export const ApiImportView: React.FC<ApiImportViewProps> = ({
  rules,
  counterparties,
  onImportPayload,
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const validateAndImport = (rawJson: string, fileName?: string) => {
    setStatusMessage(null);
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Корневой элемент JSON должен быть объектом.');
      }

      if (parsed.rules && !Array.isArray(parsed.rules)) {
        throw new Error('Поле "rules" должно быть массивом операций.');
      }

      if (parsed.counterparties && !Array.isArray(parsed.counterparties)) {
        throw new Error('Поле "counterparties" должно быть массивом контрагентов.');
      }

      if (parsed.rules) {
        for (const [idx, r] of parsed.rules.entries()) {
          const rec = r.recurrence || r.frequency;
          if (!r.title || typeof r.amount !== 'number' || !r.type || !rec) {
            throw new Error(
              `Ошибка в элементе rules[${idx}]: обязательны поля title (string), amount (number), type (INCOME|EXPENSE), recurrence (ONCE|RECURRING).`
            );
          }
        }
      }

      const result = onImportPayload(parsed);
      setStatusMessage({
        type: 'success',
        text: `Файл ${fileName ? `"${fileName}" ` : ''}успешно загружен. Добавлено операций: ${result.addedRules}, новых контрагентов: ${result.addedCounterparties}.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Ошибка чтения файла: ${err.message || 'Некорректный синтаксис JSON'}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      validateAndImport(content, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_JSON_PAYLOAD], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pym_import_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentDb = () => {
    const payload = JSON.stringify({ counterparties, rules }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pym_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* блок загрузки и выгрузки json */}
        <div className="bg-[#f5f5f5] border border-gray-400 p-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase border-b border-gray-300 pb-1.5 mb-2.5">
              1. Импорт и выгрузка данных из файла (application/json)
            </h3>
            <p className="text-gray-700 mb-3 leading-relaxed">
              Раздел предназначен для загрузки финансовых операций и справочника контрагентов из
              файла формата <code>.json</code>, а также для сохранения текущей базы данных
              приложения в файл.
            </p>

            <div className="bg-white border border-gray-400 p-3 mb-3">
              <label className="block font-bold text-gray-800 mb-1.5">
                Выберите JSON-файл для импорта в базу:
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-gray-700 file:mr-3 file:py-1 file:px-3 file:border file:border-gray-400 file:text-xs file:font-bold file:bg-[#eeeeee] file:text-gray-800 hover:file:bg-gray-300 cursor-pointer"
              />
            </div>

            {statusMessage && (
              <div
                className={`mb-3 p-2 border text-xs ${
                  statusMessage.type === 'success'
                    ? 'bg-[#dff0d8] border-[#d6e9c6] text-[#3c763d]'
                    : 'bg-[#f2dede] border-[#ebccd1] text-[#a94442]'
                }`}
              >
                {statusMessage.text}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-300">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-400 font-bold cursor-pointer"
            >
              Скачать шаблон файла (.json)
            </button>
            <button
              type="button"
              onClick={handleExportCurrentDb}
              className="px-3 py-1.5 bg-[#337ab7] hover:bg-[#286090] text-white border border-[#2e6da4] font-bold cursor-pointer"
            >
              Выгрузить текущую БД в файл ({rules.length} опер.)
            </button>
          </div>
        </div>

        {/* пример файла чтобы было понятно структуру */}
        <div className="bg-[#f5f5f5] border border-gray-400 p-3">
          <div className="flex items-center justify-between border-b border-gray-300 pb-1.5 mb-2">
            <h3 className="text-xs font-bold text-gray-800 uppercase">
              2. Пример содержимого файла импорта (.json)
            </h3>
            <span className="font-mono text-[11px] bg-white border border-gray-400 px-1.5 py-0.5">
              Формат: application/json
            </span>
          </div>

          <pre className="w-full p-2.5 font-mono text-[11px] bg-white text-gray-800 border border-gray-400 overflow-x-auto max-h-[240px] overflow-y-auto">
            {SAMPLE_JSON_PAYLOAD}
          </pre>
        </div>
      </div>

      {/* табличка с описанием полей */}
      <div className="bg-white border border-gray-400">
        <div className="bg-[#eeeeee] px-3 py-2 border-b border-gray-400">
          <h3 className="text-xs font-bold text-gray-800 uppercase">
            3. Описание полей загружаемого файла (формат application/json)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#f5f5f5] border-b border-gray-400 text-gray-800">
              <tr>
                <th className="py-1.5 px-2.5 border-r border-gray-300">Поле JSON</th>
                <th className="py-1.5 px-2.5 border-r border-gray-300">Тип данных</th>
                <th className="py-1.5 px-2.5 border-r border-gray-300">Обязательность</th>
                <th className="py-1.5 px-2.5">Описание и допустимые значения</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].title
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">string</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-bold text-[#a94442]">
                  Да
                </td>
                <td className="py-1.5 px-2.5">
                  Назначение платежа или наименование финансовой операции.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].amount
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">number</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-bold text-[#a94442]">
                  Да
                </td>
                <td className="py-1.5 px-2.5">Сумма операции в рублях (положительное число &gt; 0).</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].type
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">string (enum)</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-bold text-[#a94442]">
                  Да
                </td>
                <td className="py-1.5 px-2.5">
                  Направление движения средств: <code>"INCOME"</code> (Приход) или{' '}
                  <code>"EXPENSE"</code> (Списание).
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].recurrence
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">string (enum)</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-bold text-[#a94442]">
                  Да
                </td>
                <td className="py-1.5 px-2.5">
                  Вид периодичности: <code>"ONCE"</code> (разовый платеж) или{' '}
                  <code>"RECURRING"</code> (циклическое правило).
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].intervalType
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">string (enum)</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300">Для RECURRING</td>
                <td className="py-1.5 px-2.5">
                  Интервал повторения («Раз в:»): <code>"YEAR"</code> (год), <code>"MONTH"</code>{' '}
                  (месяц), <code>"WEEK"</code> (неделю), <code>"BIWEEKLY"</code> (2 недели),{' '}
                  <code>"CUSTOM_DAYS"</code> (произвольно через N дней).
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].customIntervalDays
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">number</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300">Для CUSTOM_DAYS</td>
                <td className="py-1.5 px-2.5">
                  Шаг повторения в днях при выборе произвольного цикла (например, <code>3</code> —
                  раз в 3 дня).
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].date / startDate / endDate
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">
                  string (YYYY-MM-DD)
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300">Условно</td>
                <td className="py-1.5 px-2.5">
                  Дата разовой операции (<code>date</code>) или границы действия циклического
                  правила (<code>startDate</code>, <code>endDate</code>) в формате ISO 8601.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  rules[].accountName
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">string</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300">Нет</td>
                <td className="py-1.5 px-2.5">
                  Банковский счет или касса организации, по которой проводится операция.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono font-bold">
                  counterparties[]
                </td>
                <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">array</td>
                <td className="py-1.5 px-2.5 border-r border-gray-300">Нет</td>
                <td className="py-1.5 px-2.5">
                  Массив объектов контрагентов (поля: <code>name</code>, <code>inn</code>,{' '}
                  <code>type</code>, <code>contract</code>, <code>accountNumber</code>).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

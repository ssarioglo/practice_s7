import React, { useState, useEffect } from 'react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onSaveUserName: (name: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userName,
  onSaveUserName,
}) => {
  const [name, setName] = useState(userName);

  useEffect(() => {
    setName(userName);
  }, [userName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSaveUserName(name.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white border-2 border-gray-500 shadow-md w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-[#337ab7] text-white border-b border-gray-500">
          <h3 className="text-sm font-bold">Карточка пользователя</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200 font-bold text-sm px-1"
          >
            [X]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-[#f5f5f5] space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-800 mb-1">
              ФИО / Должность сотрудника
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-400 text-gray-900 focus:outline-none focus:border-[#337ab7]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-400">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-400"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[#337ab7] hover:bg-[#286090] text-white font-bold border border-[#2e6da4]"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

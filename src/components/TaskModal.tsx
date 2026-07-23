import React, { useState } from 'react';
import { X, Calendar, Clock, Tag, Sparkles } from 'lucide-react';
import { Task } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartTime?: string;
  onSaveTask: (task: Omit<Task, 'id'>) => void;
  userId: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  defaultStartTime,
  onSaveTask,
  userId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(defaultStartTime || '10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [category, setCategory] = useState<Task['category']>('work');
  const [aiTip, setAiTip] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTask({
      userId,
      title: title.trim(),
      description: description.trim(),
      startTime,
      endTime,
      category,
      status: 'todo',
      aiTip: aiTip.trim() || 'Focus on completing core objectives first.'
    });

    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Create New Task
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare Presentation deck"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or subtasks..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="work">Work</option>
              <option value="study">Study</option>
              <option value="personal">Personal</option>
              <option value="meeting">Meeting</option>
              <option value="health">Health / Fitness</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Secretary Advisory Tip (Optional)</span>
            </label>
            <input
              type="text"
              value={aiTip}
              onChange={(e) => setAiTip(e.target.value)}
              placeholder="e.g., Set up quiet room and test screen share 5 mins prior"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
            >
              Save to Firestore
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

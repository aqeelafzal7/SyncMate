import React, { useState } from 'react';
import { Target, Plus, FolderCheck, CheckCircle, Sparkles, Trash2 } from 'lucide-react';
import { Project } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  onAddProject: (proj: Omit<Project, 'id'>) => void;
  userId: string;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onAddProject,
  userId,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState<string[]>([]);

  const handleAddGoal = () => {
    if (!goalInput.trim()) return;
    setGoals([...goals, goalInput.trim()]);
    setGoalInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddProject({
      userId,
      title: title.trim(),
      description: description.trim(),
      goals: goals.length > 0 ? goals : ['Complete project milestone'],
      status: 'active',
      createdAt: new Date().toISOString()
    });

    setTitle('');
    setDescription('');
    setGoals([]);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Long-Term Projects & Objectives
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track major projects and goals managed by SyncMate
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* New Project Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Initialize New Project</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Mobile App Development"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key deliverables and scope..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Key Goals / Milestones
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. Complete module 1 exam"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddGoal}
                className="px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Add Goal
              </button>
            </div>
            {goals.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {goals.map((g, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md"
            >
              Save Project
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <FolderCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Active Projects Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              You can create projects here or ask SyncMate in the floating chat to structure long-term goals for you!
            </p>
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                  {p.status}
                </span>
                <span className="text-[10px] text-slate-400">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                {p.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                {p.description}
              </p>

              <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Key Milestones
                </span>
                {p.goals.map((g, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

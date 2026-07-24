import React, { useState } from 'react';
import { Target, Plus, FolderCheck, CheckCircle, Sparkles, Trash2, Zap, Loader2 } from 'lucide-react';
import { Project, Task, UserProfile, PrayerTimings } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  onAddProject: (proj: Omit<Project, 'id'>) => void;
  onTaskCreated: (taskData: Omit<Task, 'id'>) => Promise<void> | void;
  userId: string;
  userProfile?: UserProfile | null;
  prayerTimings?: PrayerTimings | null;
  existingTasks?: Task[];
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onAddProject,
  onTaskCreated,
  userId,
  userProfile,
  prayerTimings,
  existingTasks = [],
}) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState<string[]>([]);

  // AI Project Decomposition state
  const [decomposingProjectId, setDecomposingProjectId] = useState<string | null>(null);
  const [decomposedMessage, setDecomposedMessage] = useState<{ projectId: string; text: string } | null>(null);

  const [pacingStrategy, setPacingStrategy] = useState<'balanced' | 'steady' | 'intensive'>('balanced');

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
      pacingStrategy,
      createdAt: new Date().toISOString()
    });

    setTitle('');
    setDescription('');
    setGoals([]);
    setPacingStrategy('balanced');
    setShowForm(false);
  };

  const handleDecomposeProject = async (project: Project) => {
    setDecomposingProjectId(project.id);
    setDecomposedMessage(null);

    try {
      const activeApiKey = localStorage.getItem('syncmate_gemini_api_key') || undefined;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'decompose_project',
          customApiKey: activeApiKey,
          context: {
            project,
            userProfile,
            existingTasks,
            prayerTimings,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to decompose project');
      }

      const data = await res.json();
      const replyText = data.reply || '';

      const match = replyText.match(/```json_action\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        const actionObj = JSON.parse(match[1]);
        if (actionObj.action === 'DECOMPOSE_PROJECT' && Array.isArray(actionObj.data?.tasks)) {
          const tasksToCreate = actionObj.data.tasks;
          const now = new Date();

          for (const t of tasksToCreate) {
            const dayOffset = typeof t.dayOffset === 'number' ? t.dayOffset : 0;
            const targetDateObj = new Date(now.getTime() + dayOffset * 86400000);
            const taskDate = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;

            await onTaskCreated({
              userId,
              title: t.title || `Milestone for ${project.title}`,
              description: t.description || `Subtask from ${project.title}`,
              startTime: t.startTime || '10:00',
              endTime: t.endTime || '10:45',
              category: t.category || 'study',
              status: 'todo',
              aiTip: t.aiTip || `AI Decomposed milestone for ${project.title}`,
              projectId: project.id,
              date: taskDate,
              createdAt: new Date().toISOString()
            });
          }
          setDecomposedMessage({
            projectId: project.id,
            text: `⚡ Multi-day schedule created! Assigned ${tasksToCreate.length} milestones across your upcoming Daily Timelines according to your ${project.pacingStrategy || 'balanced'} pace.`
          });
        } else {
          throw new Error('Received unexpected AI action response.');
        }
      } else {
        throw new Error('Could not parse AI response. Make sure your Gemini API key is configured.');
      }
    } catch (err: any) {
      console.error('Decompose project error:', err);
      setDecomposedMessage({
        projectId: project.id,
        text: `⚠️ Error: ${err.message || 'Failed to schedule tasks.'}`
      });
    } finally {
      setDecomposingProjectId(null);
    }
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
            Track major projects and goals, then decompose them directly into your daily prayer-aware schedule!
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
              Multi-Day Pacing Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPacingStrategy('balanced')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  pacingStrategy === 'balanced'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold flex items-center space-x-1">
                  <span>🟢 Balanced Pace</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  1 milestone / day (Recommended)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPacingStrategy('steady')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  pacingStrategy === 'steady'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold flex items-center space-x-1">
                  <span>🟡 Steady Pace</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  1 milestone every 2 days
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPacingStrategy('intensive')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  pacingStrategy === 'intensive'
                    ? 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-900 dark:text-red-200 ring-2 ring-red-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold flex items-center space-x-1">
                  <span>🔴 Intensive Pace</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Max 2 milestones / day
                </div>
              </button>
            </div>
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
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

                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 mb-4">
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

              {/* Auto-Decompose Action Area */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => handleDecomposeProject(p)}
                  disabled={decomposingProjectId === p.id}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {decomposingProjectId === p.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>SyncMate AI Decomposing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>⚡ Auto-Decompose & Schedule with AI</span>
                    </>
                  )}
                </button>

                {decomposedMessage?.projectId === p.id && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                    decomposedMessage.text.includes('Error') || decomposedMessage.text.includes('⚠️')
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {decomposedMessage.text}
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};


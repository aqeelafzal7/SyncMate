import React, { useState, useEffect } from 'react';
import {
  Target, Plus, FolderCheck, CheckCircle, Sparkles, Trash2, Zap, Loader2, Edit2, CheckCircle2,
  Trophy, X, PauseCircle, PlayCircle, Globe, Clock, Calendar
} from 'lucide-react';
import { Project, Task, UserProfile, PrayerTimings } from '../types';
import { getDecryptedApiKey } from '../lib/cryptoStorage';
import { callGeminiWithFallback } from '../lib/geminiService';
import { deductUserCredits, getFeatureCreditCost } from '../lib/creditService';

interface ProjectsViewProps {
  projects: Project[];
  onAddProject: (proj: Omit<Project, 'id'>) => void;
  onUpdateProject?: (id: string, updatedData: Partial<Project>) => Promise<void> | void;
  onDeleteProject?: (id: string) => Promise<void> | void;
  onTaskCreated: (taskData: Omit<Task, 'id'>) => Promise<void> | void;
  userId: string;
  userProfile?: UserProfile | null;
  prayerTimings?: PrayerTimings | null;
  existingTasks?: Task[];
}

interface ProjectCardProps {
  project: Project;
  existingTasks: Task[];
  onUpdateProject?: (id: string, updatedData: Partial<Project>) => Promise<void> | void;
  onDeleteProject?: (id: string) => Promise<void> | void;
  onEdit: (project: Project) => void;
  onDecompose: (project: Project) => void;
  isDecomposing: boolean;
  decomposedMessage: { projectId: string; text: string } | null;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  existingTasks,
  onUpdateProject,
  onDeleteProject,
  onEdit,
  onDecompose,
  isDecomposing,
  decomposedMessage,
}) => {
  const projectTasks = existingTasks.filter((t) => t.projectId === project.id);
  const totalCount = projectTasks.length;
  const completedCount = projectTasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isPaused = project.status === 'paused';

  // AUTO-COMPLETION EFFECT
  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount && project.status !== 'completed' && !isPaused) {
      onUpdateProject?.(project.id, { status: 'completed' });
    }
  }, [totalCount, completedCount, project.status, project.id, onUpdateProject, isPaused]);

  const handleToggleComplete = () => {
    const newStatus = project.status === 'completed' ? 'active' : 'completed';
    onUpdateProject?.(project.id, { status: newStatus });
  };

  const handleTogglePause = () => {
    const newStatus = project.status === 'paused' ? 'active' : 'paused';
    onUpdateProject?.(project.id, { status: newStatus });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
      onDeleteProject?.(project.id);
    }
  };

  return (
    <div className={`border rounded-3xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between ${
      project.status === 'completed'
        ? 'border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/10 dark:bg-emerald-950/10'
        : isPaused
        ? 'border-amber-400/40 dark:border-amber-500/40 bg-amber-50/20 dark:bg-slate-900/60'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
    }`}>
      <div>
        {/* Card Header & Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              project.status === 'completed'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : isPaused
                ? 'bg-amber-100/90 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : project.status === 'on_hold'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
            }`}>
              {isPaused ? '⏸️ PAUSED (Exam Mode)' : project.status}
            </span>
            <span className="text-[10px] text-slate-400">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Top-Right Action Controls */}
          <div className="flex items-center space-x-1.5">
            {/* Pause / Resume Button (Exam Mode) */}
            <button
              type="button"
              onClick={handleTogglePause}
              title={isPaused ? 'Resume Course (Exit Exam Mode)' : 'Pause Course (Exam Mode)'}
              className={`p-1.5 rounded-xl border transition-all ${
                isPaused
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            </button>

            {/* Toggle Complete Button */}
            <button
              type="button"
              onClick={handleToggleComplete}
              title={project.status === 'completed' ? 'Mark Active' : 'Mark Completed'}
              className={`p-1.5 rounded-xl border transition-all ${
                project.status === 'completed'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => onEdit(project)}
              title="Edit Project"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={handleDelete}
              title="Delete Project"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Title & Description */}
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
          {project.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
          {project.description}
        </p>

        {/* Course Parameters Metadata */}
        {(project.platform || project.timeCommitment || project.totalDuration) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.platform && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-100 dark:border-indigo-900">
                <Globe className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>{project.platform}</span>
              </span>
            )}
            {project.timeCommitment && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-100 dark:border-emerald-900">
                <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>{project.timeCommitment}</span>
              </span>
            )}
            {project.totalDuration && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-50/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-medium border border-purple-100 dark:border-purple-900">
                <Calendar className="w-3 h-3 text-purple-500 shrink-0" />
                <span>{project.totalDuration}</span>
              </span>
            )}
          </div>
        )}

        {/* Dynamic Progress Bar */}
        <div className="mb-4 space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <span>Linked Task Progress</span>
            <span>
              {totalCount > 0
                ? `${completedCount} of ${totalCount} Milestones (${progressPercent}%)`
                : 'No tasks linked'}
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPercent === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Celebration Badge */}
          {totalCount > 0 && completedCount === totalCount && (
            <div className="mt-2 py-1.5 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center space-x-1.5 border border-emerald-300/60 dark:border-emerald-800">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0 animate-bounce" />
              <span>🏆 100% Milestones Accomplished!</span>
            </div>
          )}
        </div>

        {/* Goals & Milestones List */}
        <div className="space-y-1.5 pt-1 mb-4">
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Key Goals & Milestones (Sub-Steps / Chapters)
          </span>
          {project.goals.map((g, idx) => (
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
          onClick={() => onDecompose(project)}
          disabled={isDecomposing || isPaused}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.99] ${
            isPaused
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/20 disabled:opacity-50'
          }`}
        >
          {isPaused ? (
            <>
              <PauseCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Course Paused — Unpause to resume AI scheduling.</span>
            </>
          ) : isDecomposing ? (
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

        {decomposedMessage?.projectId === project.id && (
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
  );
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onTaskCreated,
  userId,
  userProfile,
  prayerTimings,
  existingTasks = [],
}) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('');
  const [timeCommitment, setTimeCommitment] = useState('');
  const [totalDuration, setTotalDuration] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [pacingStrategy, setPacingStrategy] = useState<'balanced' | 'steady' | 'intensive'>('balanced');

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPlatform, setEditPlatform] = useState('');
  const [editTimeCommitment, setEditTimeCommitment] = useState('');
  const [editTotalDuration, setEditTotalDuration] = useState('');
  const [editGoalInput, setEditGoalInput] = useState('');
  const [editGoals, setEditGoals] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'on_hold' | 'paused'>('active');
  const [editPacingStrategy, setEditPacingStrategy] = useState<'balanced' | 'steady' | 'intensive'>('balanced');

  // AI Project Decomposition state
  const [decomposingProjectId, setDecomposingProjectId] = useState<string | null>(null);
  const [decomposedMessage, setDecomposedMessage] = useState<{ projectId: string; text: string } | null>(null);

  const handleAddGoal = () => {
    if (!goalInput.trim()) return;
    setGoals([...goals, goalInput.trim()]);
    setGoalInput('');
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingProject(proj);
    setEditTitle(proj.title);
    setEditDescription(proj.description || '');
    setEditPlatform(proj.platform || '');
    setEditTimeCommitment(proj.timeCommitment || '');
    setEditTotalDuration(proj.totalDuration || '');
    setEditGoals([...(proj.goals || [])]);
    setEditGoalInput('');
    setEditStatus(proj.status || 'active');
    setEditPacingStrategy(proj.pacingStrategy || 'balanced');
  };

  const handleAddEditGoal = () => {
    if (!editGoalInput.trim()) return;
    setEditGoals([...editGoals, editGoalInput.trim()]);
    setEditGoalInput('');
  };

  const handleRemoveEditGoal = (index: number) => {
    setEditGoals(editGoals.filter((_, i) => i !== index));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editTitle.trim()) return;

    onUpdateProject?.(editingProject.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      platform: editPlatform.trim() || undefined,
      timeCommitment: editTimeCommitment.trim() || undefined,
      totalDuration: editTotalDuration.trim() || undefined,
      goals: editGoals.length > 0 ? editGoals : ['Complete project milestone'],
      status: editStatus,
      pacingStrategy: editPacingStrategy,
    });

    setEditingProject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddProject({
      userId,
      title: title.trim(),
      description: description.trim(),
      platform: platform.trim() || undefined,
      timeCommitment: timeCommitment.trim() || undefined,
      totalDuration: totalDuration.trim() || undefined,
      goals: goals.length > 0 ? goals : ['Complete project milestone'],
      status: 'active',
      pacingStrategy,
      createdAt: new Date().toISOString()
    });

    setTitle('');
    setDescription('');
    setPlatform('');
    setTimeCommitment('');
    setTotalDuration('');
    setGoals([]);
    setPacingStrategy('balanced');
    setShowForm(false);
  };

  const handleDecomposeProject = async (project: Project) => {
    if (project.status === 'paused') {
      setDecomposedMessage({
        projectId: project.id,
        text: '⚠️ Course Paused — Unpause to resume AI scheduling.'
      });
      return;
    }

    const canProceed = await deductUserCredits(getFeatureCreditCost('project'), userId);
    if (!canProceed) return;

    setDecomposingProjectId(project.id);
    setDecomposedMessage(null);

    try {
      const decomposePrompt = `You are SyncMate AI Planner. Decompose the following project into actionable milestone tasks according to the project's pacing strategy (${project.pacingStrategy || 'balanced'}).

PROJECT DETAILS:
Title: ${project.title}
Description: ${project.description || 'N/A'}
Platform: ${project.platform || 'N/A'}
Time Available: ${project.timeCommitment || 'N/A'}
Total Duration: ${project.totalDuration || 'N/A'}
Goals/Milestones: ${Array.isArray(project.goals) ? project.goals.join(', ') : 'N/A'}

USER CONTEXT:
Name: ${userProfile?.fullName || 'User'}
Religion/Focus: ${userProfile?.religion || 'General'}

Return a JSON action block surrounded by \`\`\`json_action and \`\`\` containing:
{
  "action": "DECOMPOSE_PROJECT",
  "data": {
    "tasks": [
      {
        "title": "Milestone title",
        "description": "Short description",
        "startTime": "10:00",
        "endTime": "10:45",
        "category": "study",
        "aiTip": "Actionable tip",
        "dayOffset": 0
      }
    ]
  }
}
Day offsets should range from 0 up to 7 depending on pacing. Ensure valid JSON inside \`\`\`json_action \`\`\`.`;

      const replyText = await callGeminiWithFallback(decomposePrompt);

      let actionObj: any = null;
      const match = replyText.match(/```json_action\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        actionObj = JSON.parse(match[1]);
      } else {
        // Fallback: try parsing JSON directly if markdown wrapper missing
        try {
          actionObj = JSON.parse(replyText);
        } catch (e) {
          // ignore
        }
      }

      if (actionObj && (actionObj.action === 'DECOMPOSE_PROJECT' || Array.isArray(actionObj.data?.tasks) || Array.isArray(actionObj.tasks))) {
        const tasksToCreate = actionObj.data?.tasks || actionObj.tasks || [];
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
        throw new Error('Received unexpected AI response structure.');
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Platform / Source
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Where are you taking this course? (e.g., Coursera, YouTube, Khan Academy, Udemy)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Available Time Commitment
              </label>
              <input
                type="text"
                value={timeCommitment}
                onChange={(e) => setTimeCommitment(e.target.value)}
                placeholder="Daily or Weekly Time Available (e.g., 45 mins/day, 3 hrs/week)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Target Duration
              </label>
              <input
                type="text"
                value={totalDuration}
                onChange={(e) => setTotalDuration(e.target.value)}
                placeholder="Total course hours or weeks needed (e.g., 15 hours total, 6 weeks)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
            </div>
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
              Key Goals & Milestones (Sub-Steps / Chapters)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              Break your course into bite-sized chapters or deliverables for AI scheduling.
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. Complete Chapter 1 or Module 1"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddGoal}
                className="px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Add Milestone
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

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-indigo-500" />
                <span>Edit Project</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Title
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Platform
                </label>
                <input
                  type="text"
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value)}
                  placeholder="e.g. Coursera"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Time Available
                </label>
                <input
                  type="text"
                  value={editTimeCommitment}
                  onChange={(e) => setEditTimeCommitment(e.target.value)}
                  placeholder="e.g. 45 mins/day"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Duration
                </label>
                <input
                  type="text"
                  value={editTotalDuration}
                  onChange={(e) => setEditTotalDuration(e.target.value)}
                  placeholder="e.g. 15 hours"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'active' | 'completed' | 'on_hold' | 'paused')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="paused">⏸️ Paused (Exam Mode)</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Multi-Day Pacing Strategy
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditPacingStrategy('balanced')}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                    editPacingStrategy === 'balanced'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  🟢 Balanced
                </button>
                <button
                  type="button"
                  onClick={() => setEditPacingStrategy('steady')}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                    editPacingStrategy === 'steady'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  🟡 Steady
                </button>
                <button
                  type="button"
                  onClick={() => setEditPacingStrategy('intensive')}
                  className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                    editPacingStrategy === 'intensive'
                      ? 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-900 dark:text-red-200 ring-2 ring-red-500/30'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  🔴 Intensive
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Key Goals & Milestones (Sub-Steps / Chapters)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Break your course into bite-sized chapters or deliverables for AI scheduling.
              </p>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={editGoalInput}
                  onChange={(e) => setEditGoalInput(e.target.value)}
                  placeholder="e.g. Complete chapter 2"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddEditGoal}
                  className="px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                >
                  Add Milestone
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {editGoals.map((g, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1"
                  >
                    <span>{g}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEditGoal(i)}
                      className="text-indigo-400 hover:text-red-500 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 text-xs font-medium text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
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
            <ProjectCard
              key={p.id}
              project={p}
              existingTasks={existingTasks}
              onUpdateProject={onUpdateProject}
              onDeleteProject={onDeleteProject}
              onEdit={handleOpenEdit}
              onDecompose={handleDecomposeProject}
              isDecomposing={decomposingProjectId === p.id}
              decomposedMessage={decomposedMessage}
            />
          ))
        )}
      </div>

    </div>
  );
};

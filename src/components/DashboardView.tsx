import React from 'react';
import { Timeline } from './Timeline';
import { UserProfile, Task, Project, PrayerTimings, WeatherData } from '../types';

interface DashboardViewProps {
  userProfile: UserProfile | null;
  tasks: Task[];
  projects: Project[];
  prayerTimings: PrayerTimings | null;
  weather: WeatherData | null;
  onToggleTaskStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenAddTaskModal: (timeSlot?: string) => void;
  onOpenCitySearch?: () => void;
  onIslamicModalChange?: (isOpen: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = (props) => {
  return <Timeline {...props} />;
};

export default DashboardView;

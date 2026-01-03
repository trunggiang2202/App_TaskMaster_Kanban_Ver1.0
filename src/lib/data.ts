import type { Task } from './types';

const now = new Date();

const getRelativeDate = (dayOffset: number, hour: number = 0, minute: number = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
};

export const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Launch new marketing campaign',
    description: 'Plan and execute a new marketing campaign for the Q3 product launch.',
    status: 'In Progress',
    createdAt: getRelativeDate(-10),
    startDate: getRelativeDate(-10),
    endDate: getRelativeDate(20),
    attachments: [
        { name: 'Campaign-Brief-Q3.pdf', url: '#' },
        { name: 'Marketing-Assets.zip', url: '#' },
    ],
    subtasks: [
      { id: 'sub-1-1', title: 'Draft campaign brief', completed: true, startDate: getRelativeDate(-10), endDate: getRelativeDate(-8) },
      { id: 'sub-1-2', title: 'Design visual assets', completed: true, startDate: getRelativeDate(-7), endDate: getRelativeDate(-2) },
      { id: 'sub-1-3', title: 'Develop ad copy', completed: false, attachments: [{ name: 'Ad-Copy-Draft.docx', url: '#' }], startDate: getRelativeDate(-1), endDate: getRelativeDate(5) },
      { id: 'sub-1-4', title: 'Setup tracking and analytics', completed: false, startDate: getRelativeDate(6), endDate: getRelativeDate(10) },
    ],
  },
  {
    id: 'task-2',
    title: 'Develop user authentication feature',
    description: 'Implement email/password and social login for the main application.',
    status: 'To Do',
    createdAt: getRelativeDate(-5),
    startDate: getRelativeDate(1),
    endDate: getRelativeDate(30),
    subtasks: [
      { id: 'sub-2-1', title: 'API endpoint for registration', completed: false, startDate: getRelativeDate(1), endDate: getRelativeDate(10) },
      { id: 'sub-2-2', title: 'Frontend login form', completed: false, startDate: getRelativeDate(11), endDate: getRelativeDate(20) },
      { id: 'sub-2-3', title: 'Integrate Google OAuth', completed: false, startDate: getRelativeDate(21), endDate: getRelativeDate(30) },
    ],
  },
  {
    id: 'task-3',
    title: 'Refactor legacy database schema',
    description: 'Update the old database schema to improve performance and scalability.',
    status: 'To Do',
    createdAt: getRelativeDate(-2),
    startDate: getRelativeDate(5),
    endDate: getRelativeDate(45),
    subtasks: [],
  },
  {
    id: 'task-4',
    title: 'Onboard new UI/UX Designer',
    description: 'Complete the onboarding process for the new designer joining the team.',
    status: 'Done',
    createdAt: getRelativeDate(-14),
    startDate: getRelativeDate(-14),
    endDate: getRelativeDate(-1),
    subtasks: [
        { id: 'sub-4-1', title: 'Setup hardware and software', completed: true, startDate: getRelativeDate(-14), endDate: getRelativeDate(-14) },
        { id: 'sub-4-2', title: 'Introduce to the team', completed: true, startDate: getRelativeDate(-13), endDate: getRelativeDate(-13) },
        { id: 'sub-4-3', title: 'Walkthrough of current projects', completed: true, startDate: getRelativeDate(-12), endDate: getRelativeDate(-10) },
    ],
  },
];

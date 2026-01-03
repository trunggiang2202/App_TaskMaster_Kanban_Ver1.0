import type { Task } from './types';

export const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Launch new marketing campaign',
    description: 'Plan and execute a new marketing campaign for the Q3 product launch.',
    status: 'In Progress',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 10)),
    deadline: new Date(new Date().setDate(new Date().getDate() + 20)),
    subtasks: [
      { id: 'sub-1-1', title: 'Draft campaign brief', completed: true, deadline: new Date(new Date().setDate(new Date().getDate() - 8)) },
      { id: 'sub-1-2', title: 'Design visual assets', completed: true, deadline: new Date(new Date().setDate(new Date().getDate() - 2)) },
      { id: 'sub-1-3', title: 'Develop ad copy', completed: false, deadline: new Date(new Date().setDate(new Date().getDate() + 5)) },
      { id: 'sub-1-4', title: 'Setup tracking and analytics', completed: false, deadline: new Date(new Date().setDate(new Date().getDate() + 10)) },
    ],
  },
  {
    id: 'task-2',
    title: 'Develop user authentication feature',
    description: 'Implement email/password and social login for the main application.',
    status: 'To Do',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
    subtasks: [
      { id: 'sub-2-1', title: 'API endpoint for registration', completed: false, deadline: new Date(new Date().setDate(new Date().getDate() + 7)) },
      { id: 'sub-2-2', title: 'Frontend login form', completed: false, deadline: new Date(new Date().setDate(new Date().getDate() + 14)) },
      { id: 'sub-2-3', title: 'Integrate Google OAuth', completed: false, deadline: new Date(new Date().setDate(new Date().getDate() + 21)) },
    ],
  },
  {
    id: 'task-3',
    title: 'Refactor legacy database schema',
    description: 'Update the old database schema to improve performance and scalability.',
    status: 'To Do',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    deadline: new Date(new Date().setDate(new Date().getDate() + 45)),
    subtasks: [],
  },
  {
    id: 'task-4',
    title: 'Onboard new UI/UX Designer',
    description: 'Complete the onboarding process for the new designer joining the team.',
    status: 'Done',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 14)),
    deadline: new Date(new Date().setDate(new Date().getDate() - 1)),
    subtasks: [
        { id: 'sub-4-1', title: 'Setup hardware and software', completed: true },
        { id: 'sub-4-2', title: 'Introduce to the team', completed: true },
        { id: 'sub-4-3', title: 'Walkthrough of current projects', completed: true },
    ],
  },
];

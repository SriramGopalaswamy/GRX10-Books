
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OSUser as User, Goal, Memo, OSTeam as Team, GoalType, GoalStatus, MemoStatus, OSNotification as Notification } from '../types';

// Helper for dates
const getDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

// Mock Data
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Sriram (Founder)', email: 'sriram@grx10.com', role: 'Admin', team: Team.LEADERSHIP, avatarUrl: 'https://picsum.photos/id/1/200/200' },
  { id: 'u2', name: 'Prem (Founder)', email: 'prem@grx10.com', role: 'Admin', team: Team.LEADERSHIP, avatarUrl: 'https://picsum.photos/id/2/200/200' },
  { id: 'u3', name: 'Arjun (RevOps)', email: 'arjun@grx10.com', role: 'Manager', team: Team.REVOPS, avatarUrl: 'https://picsum.photos/id/3/200/200' },
  { id: 'u4', name: 'Sarah (Solar)', email: 'sarah@grx10.com', role: 'Employee', team: Team.SOLAR_OPS, avatarUrl: 'https://picsum.photos/id/4/200/200' },
];

const MOCK_GOALS: Goal[] = [
  {
    id: 'g1',
    ownerId: 'u4',
    title: 'Increase Residential Solar Installs',
    type: GoalType.QUARTERLY,
    metric: 'Installations/Month',
    baseline: 12,
    target: 20,
    current: 15,
    timeline: '2024-06-30',
    status: GoalStatus.ON_TRACK,
    comments: [
      { id: 'c1', authorId: 'u3', text: 'Great progress! Are we still waiting on the panel shipments?', timestamp: 'May 12, 10:30 AM' },
      { id: 'c2', authorId: 'u4', text: 'Yes, arriving next Tuesday. We should hit 18 by month end.', timestamp: 'May 12, 11:15 AM' }
    ]
  },
  {
    id: 'g2',
    ownerId: 'u3',
    title: 'Reduce CAC via LinkedIn Ads',
    type: GoalType.QUARTERLY,
    metric: 'CAC ($)',
    baseline: 150,
    target: 90,
    current: 110,
    timeline: '2024-06-30',
    status: GoalStatus.AT_RISK,
    comments: []
  }
];

const MOCK_MEMOS: Memo[] = [
  {
    id: 'm1',
    fromId: 'u3',
    toId: 'u1',
    date: '2024-05-10',
    subject: 'Proposed Switch to HubSpot',
    status: MemoStatus.APPROVED,
    summary: 'Problem: Current Salesforce setup costs $4k/mo with low adoption.\n\nSolution: Migrate to HubSpot Pro to save $32k/annually and improve rep adoption to 80%.\n\nAsk: Approve $10k budget for migration consultant.',
    attachments: [
      { id: 'a1', name: 'HubSpot_Pricing_Comparison.pdf', size: '2.4 MB', type: 'application/pdf' },
      { id: 'a2', name: 'Migration_Timeline.xlsx', size: '1.1 MB', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ],
    comments: []
  },
  {
    id: 'm2',
    fromId: 'u4',
    toId: 'u3', // Sent to Arjun
    date: getDaysAgo(3), // 3 days old, should trigger notification
    subject: 'Urgent: Solar Panel Supplier Switch',
    status: MemoStatus.PENDING_REVIEW,
    summary: 'Problem: Current supplier delayed Q3 shipment by 14 days.\n\nSolution: Switch to backup vendor "SolTech" for this batch. Cost is +5% but guarantees delivery.\n\nRisks: Margin impact is -0.5%.\n\nAsk: Approve immediate PO generation for SolTech.',
    attachments: [],
    comments: []
  }
];

interface StoreContextType {
  currentUser: User;
  users: User[];
  goals: Goal[];
  memos: Memo[];
  notifications: Notification[];
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  addMemo: (memo: Memo) => void;
  updateMemo: (memo: Memo) => void;
  setCurrentUser: (user: User) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children?: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[2]); // Default to Arjun (Manager)
  const [users] = useState<User[]>(MOCK_USERS);
  const [goals, setGoals] = useState<Goal[]>(MOCK_GOALS);
  const [memos, setMemos] = useState<Memo[]>(MOCK_MEMOS);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Check for overdue memos on mount
  useEffect(() => {
    const checkOverdue = () => {
        const now = new Date();
        const newNotifs: Notification[] = [];

        memos.forEach(memo => {
            if (memo.status === MemoStatus.PENDING_REVIEW) {
                const memoDate = new Date(memo.date);
                const diffTime = Math.abs(now.getTime() - memoDate.getTime());
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

                if (diffHours > 48) {
                    // Determine recipients
                    const recipients = memo.toId === 'ALL' 
                        ? users.filter(u => u.id !== memo.fromId)
                        : users.filter(u => u.id === memo.toId);

                    recipients.forEach(recipient => {
                         // Avoid duplicate notifications for this session
                         if (!notifications.some(n => n.userId === recipient.id && n.message.includes(memo.id))) {
                             newNotifs.push({
                                 id: Math.random().toString(36).substr(2, 9),
                                 userId: recipient.id,
                                 title: 'Action Required: Overdue Memo',
                                 message: `Memo "${memo.subject}" has been pending review for ${diffHours} hours. Please review immediately.`,
                                 type: 'alert',
                                 read: false,
                                 timestamp: 'Just now',
                                 actionLink: 'memos'
                             });
                             
                             // Simulate Email System
                             console.log(`[EMAIL SERVICE] To: ${recipient.email} | Subject: URGENT - Memo Pending Review | Body: The memo "${memo.subject}" is overdue.`);
                         }
                    });
                }
            }
        });

        if (newNotifs.length > 0) {
            setNotifications(prev => [...prev, ...newNotifs]);
        }
    };

    checkOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to simulate system check

  const addGoal = (goal: Goal) => setGoals(prev => [...prev, goal]);
  
  const updateGoal = (updatedGoal: Goal) => {
    setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
  };

  const addMemo = (memo: Memo) => setMemos(prev => [...prev, memo]);

  const updateMemo = (updatedMemo: Memo) => {
    setMemos(prev => prev.map(m => m.id === updatedMemo.id ? updatedMemo : m));
  };

  const markNotificationRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <StoreContext.Provider value={{ currentUser, users, goals, memos, notifications, addGoal, updateGoal, addMemo, updateMemo, setCurrentUser, markNotificationRead, markAllNotificationsRead }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};

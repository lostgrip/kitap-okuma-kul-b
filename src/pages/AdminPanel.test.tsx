import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPanel from './AdminPanel';

// Mock contexts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Custom Hooks
vi.mock('@/hooks/useUserRoles', () => ({
  useIsAdmin: vi.fn(),
  useGroupMembers: vi.fn(),
  useAddUserRole: vi.fn(),
  useRemoveUserRole: vi.fn(),
}));

vi.mock('@/hooks/useInviteCodes', () => ({
  useInviteCodes: vi.fn(),
  useCreateInviteCode: vi.fn(),
  useDeactivateInviteCode: vi.fn(),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroups: vi.fn(),
  useCreateGroup: vi.fn(),
}));

vi.mock('@/hooks/useClubSchedule', () => ({
  useClubSchedule: vi.fn(),
  useAddClubSchedule: vi.fn(),
  useUpdateClubSchedule: vi.fn(),
  useDeleteClubSchedule: vi.fn(),
}));

vi.mock('@/hooks/useBooks', () => ({
  useBooks: vi.fn(),
  usePendingClubBooks: vi.fn(),
  useApproveClubBook: vi.fn(),
  useDeleteBook: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useGroupMembers, useAddUserRole, useRemoveUserRole } from '@/hooks/useUserRoles';
import { useInviteCodes, useCreateInviteCode, useDeactivateInviteCode } from '@/hooks/useInviteCodes';
import { useGroups, useCreateGroup } from '@/hooks/useGroups';
import { useClubSchedule, useAddClubSchedule, useUpdateClubSchedule, useDeleteClubSchedule } from '@/hooks/useClubSchedule';
import { useBooks } from '@/hooks/useBooks';

describe('AdminPanel Integration', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Auth
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin123' },
      profile: { group_code: 'TESTGROUP' },
    } as any);

    // IsAdmin
    vi.mocked(useIsAdmin).mockReturnValue({ data: true, isLoading: false } as any);

    // Members
    vi.mocked(useGroupMembers).mockReturnValue({
      data: [
        { id: '1', user_id: 'admin123', username: 'adminuser', user_roles: [{ role: 'admin' }] },
        { id: '2', user_id: 'regular123', username: 'regularuser', user_roles: [] },
      ],
      isLoading: false,
    } as any);
    
    vi.mocked(useAddUserRole).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useRemoveUserRole).mockReturnValue({ mutateAsync: vi.fn() } as any);

    // Invite Codes
    vi.mocked(useInviteCodes).mockReturnValue({
      data: [{ id: 'code1', invite_code: 'TEST-CODE-1', uses_count: 0, is_active: true }],
      isLoading: false,
    } as any);
    vi.mocked(useCreateInviteCode).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useDeactivateInviteCode).mockReturnValue({ mutateAsync: vi.fn() } as any);

    // Groups
    vi.mocked(useGroups).mockReturnValue({
      data: [{ id: 'group1', group_code: 'TESTGROUP', group_name: 'Test Group' }],
      isLoading: false,
    } as any);
    vi.mocked(useCreateGroup).mockReturnValue({ mutateAsync: vi.fn() } as any);

    // Schedule
    vi.mocked(useClubSchedule).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(useAddClubSchedule).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useUpdateClubSchedule).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useDeleteClubSchedule).mockReturnValue({ mutateAsync: vi.fn() } as any);

    // Books
    vi.mocked(useBooks).mockReturnValue({
      data: [{ id: 'book1', title: 'Test Book' }],
      isLoading: false,
    } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <AdminPanel />
    </MemoryRouter>
  );

  it('redirects or renders nothing if user is not admin', () => {
    vi.mocked(useIsAdmin).mockReturnValue({ data: false, isLoading: false } as any);
    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders loading state when initial data is loading', () => {
    vi.mocked(useIsAdmin).mockReturnValue({ data: undefined, isLoading: true } as any);
    renderComponent();
    // In shadcn context the loader contains a spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders member management tab by default', () => {
    renderComponent();
    expect(screen.getByText('Admin Paneli')).toBeInTheDocument();
    
    // Check member list
    expect(screen.getByText('adminuser')).toBeInTheDocument();
    expect(screen.getByText('regularuser')).toBeInTheDocument();
    
    // Action buttons
    expect(screen.getByRole('button', { name: /admin yap/i })).toBeInTheDocument();
  });

  it('can switch to invites tab and render invite codes', () => {
    renderComponent();
    
    // Switch tab
    fireEvent.click(screen.getByRole('button', { name: /davetler/i }));
    
    // Should show invite codes
    expect(screen.getByText('TEST-CODE-1')).toBeInTheDocument();
    // Buttons for action
    expect(screen.getByRole('button', { name: /yeni kod/i })).toBeInTheDocument();
  });

  it('can switch to groups tab and render grouping info', () => {
    renderComponent();
    
    fireEvent.click(screen.getByRole('button', { name: /gruplar/i }));
    
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('yeni grup', { exact: false })).toBeInTheDocument();
  });
});

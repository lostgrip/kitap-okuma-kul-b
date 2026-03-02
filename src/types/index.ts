export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  group_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface GroupMember extends UserProfile {
  user_id: string;
  user_roles: UserRole[];
}

export interface InviteCode {
  id: string;
  invite_code: string;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  group_code: string;
  created_at: string;
  expires_at: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: 'daily' | 'weekly' | 'monthly';
  target_pages: number;
  target_books: number;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  status: 'reading' | 'completed' | 'want_to_read';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

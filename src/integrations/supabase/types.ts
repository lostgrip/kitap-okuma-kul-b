export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      book_discussions: {
        Row: {
          book_id: string
          content: string
          created_at: string
          has_spoiler: boolean
          id: string
          page_reference: number | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          content: string
          created_at?: string
          has_spoiler?: boolean
          id?: string
          page_reference?: number | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          has_spoiler?: boolean
          id?: string
          page_reference?: number | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_discussions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "book_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_list_items: {
        Row: {
          added_at: string
          book_id: string
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          book_id: string
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string
          book_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_list_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "book_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      book_lists: {
        Row: {
          created_at: string
          description: string | null
          group_code: string | null
          id: string
          is_approved: boolean
          is_community: boolean
          is_default: boolean
          list_type: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_code?: string | null
          id?: string
          is_approved?: boolean
          is_community?: boolean
          is_default?: boolean
          list_type?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_code?: string | null
          id?: string
          is_approved?: boolean
          is_community?: boolean
          is_default?: boolean
          list_type?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      book_notes: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          note_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          note_text?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          note_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reviews: {
        Row: {
          book_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_votes: {
        Row: {
          book_id: string
          created_at: string
          group_code: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          group_code: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          group_code?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_votes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          added_by: string | null
          author: string
          club_status: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          epub_url: string | null
          genre: string | null
          id: string
          page_count: number
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          author: string
          club_status?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          epub_url?: string | null
          genre?: string | null
          id?: string
          page_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          author?: string
          club_status?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          epub_url?: string | null
          genre?: string | null
          id?: string
          page_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          group_code: string
          id: string
          is_pinned: boolean
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          group_code: string
          id?: string
          is_pinned?: boolean
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          group_code?: string
          id?: string
          is_pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      club_schedule: {
        Row: {
          book_id: string
          created_at: string
          created_by: string
          end_date: string | null
          group_code: string
          id: string
          notes: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          created_by: string
          end_date?: string | null
          group_code: string
          id?: string
          notes?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          group_code?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_schedule_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quotes: {
        Row: {
          author: string | null
          book_id: string | null
          created_at: string
          featured_date: string | null
          group_code: string
          id: string
          quote_text: string
          user_id: string
        }
        Insert: {
          author?: string | null
          book_id?: string | null
          created_at?: string
          featured_date?: string | null
          group_code: string
          id?: string
          quote_text: string
          user_id: string
        }
        Update: {
          author?: string | null
          book_id?: string | null
          created_at?: string
          featured_date?: string | null
          group_code?: string
          id?: string
          quote_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          book_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          post_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          email: string | null
          feedback_type: string
          id: string
          message: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          feedback_type: string
          id?: string
          message: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          feedback_type?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      group_invite_codes: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          group_code: string
          id: string
          invite_code: string
          is_active: boolean
          max_uses: number | null
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          group_code: string
          id?: string
          invite_code?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          group_code?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          goal_reminders: boolean
          id: string
          new_book_notifications: boolean
          push_enabled: boolean
          social_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_reminders?: boolean
          id?: string
          new_book_notifications?: boolean
          push_enabled?: boolean
          social_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_reminders?: boolean
          id?: string
          new_book_notifications?: boolean
          push_enabled?: boolean
          social_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          group_code: string | null
          id: string
          is_admin: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          group_code?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          group_code?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      reading_goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          target_books: number
          target_pages: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_type: string
          id?: string
          target_books?: number
          target_pages?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          target_books?: number
          target_pages?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_log: {
        Row: {
          book_id: string
          current_page: number
          id: string
          logged_at: string
          pages_read: number
          user_id: string
        }
        Insert: {
          book_id: string
          current_page?: number
          id?: string
          logged_at?: string
          pages_read?: number
          user_id: string
        }
        Update: {
          book_id?: string
          current_page?: number
          id?: string
          logged_at?: string
          pages_read?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_log_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          completed_at: string | null
          created_at: string
          current_page: number
          id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          created_at?: string
          current_page?: number
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          created_at?: string
          current_page?: number
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_books: {
        Row: {
          book_id: string
          completed_at: string | null
          created_at: string
          id: string
          last_location: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_location?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_location?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voting_nominations: {
        Row: {
          book_author: string
          book_cover_url: string | null
          book_title: string
          created_at: string
          group_code: string
          id: string
          user_id: string
        }
        Insert: {
          book_author: string
          book_cover_url?: string | null
          book_title: string
          created_at?: string
          group_code: string
          id?: string
          user_id: string
        }
        Update: {
          book_author?: string
          book_cover_url?: string | null
          book_title?: string
          created_at?: string
          group_code?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_group_code: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_invite_code_use: { Args: { code_id: string }; Returns: boolean }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

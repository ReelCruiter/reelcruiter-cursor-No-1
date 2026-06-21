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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_deletes: {
        Row: {
          conversation_id: string
          deleted_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          deleted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          deleted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_deletes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string
          role_context: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          role_context?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          role_context?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      experiences: {
        Row: {
          category: string
          company: string
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          start_date: string
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          category?: string
          company: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          start_date: string
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          category?: string
          company?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_note: string | null
          created_at: string
          id: string
          post_id: string
          status: string
        }
        Insert: {
          applicant_id: string
          cover_note?: string | null
          created_at?: string
          id?: string
          post_id: string
          status?: string
        }
        Update: {
          applicant_id?: string
          cover_note?: string | null
          created_at?: string
          id?: string
          post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          message: string | null
          post_id: string | null
          read: boolean
          recipient_id: string
          role_context: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          message?: string | null
          post_id?: string | null
          read?: boolean
          recipient_id: string
          role_context?: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          message?: string | null
          post_id?: string | null
          read?: boolean
          recipient_id?: string
          role_context?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          address_visibility: string
          apply_url: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string | null
          desired_role: string | null
          experience_level: string | null
          full_address: string | null
          hidden_from_feed: boolean
          id: string
          immediate_start: boolean
          is_public: boolean
          is_workplace_video: boolean
          job_title: string
          job_type: string | null
          openings: number | null
          post_kind: string | null
          preferred_location: string | null
          salary: string | null
          tag: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          work_arrangement: string | null
        }
        Insert: {
          address_visibility?: string
          apply_url?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          desired_role?: string | null
          experience_level?: string | null
          full_address?: string | null
          hidden_from_feed?: boolean
          id?: string
          immediate_start?: boolean
          is_public?: boolean
          is_workplace_video?: boolean
          job_title: string
          job_type?: string | null
          openings?: number | null
          post_kind?: string | null
          preferred_location?: string | null
          salary?: string | null
          tag: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          work_arrangement?: string | null
        }
        Update: {
          address_visibility?: string
          apply_url?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          desired_role?: string | null
          experience_level?: string | null
          full_address?: string | null
          hidden_from_feed?: boolean
          id?: string
          immediate_start?: boolean
          is_public?: boolean
          is_workplace_video?: boolean
          job_title?: string
          job_type?: string | null
          openings?: number | null
          post_kind?: string | null
          preferred_location?: string | null
          salary?: string | null
          tag?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          work_arrangement?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_mode: string
          avatar_url: string | null
          bio: string | null
          company_description: string | null
          company_facebook: string | null
          company_industry: string | null
          company_instagram: string | null
          company_linkedin: string | null
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          company_tiktok: string | null
          company_twitter: string | null
          company_website: string | null
          company_whatsapp: string | null
          company_youtube: string | null
          created_at: string
          email_notifications_enabled: boolean
          full_name: string | null
          id: string
          intro_video_url: string | null
          last_active_at: string | null
          location: string | null
          resume_url: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_mode?: string
          avatar_url?: string | null
          bio?: string | null
          company_description?: string | null
          company_facebook?: string | null
          company_industry?: string | null
          company_instagram?: string | null
          company_linkedin?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_tiktok?: string | null
          company_twitter?: string | null
          company_website?: string | null
          company_whatsapp?: string | null
          company_youtube?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          full_name?: string | null
          id?: string
          intro_video_url?: string | null
          last_active_at?: string | null
          location?: string | null
          resume_url?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_mode?: string
          avatar_url?: string | null
          bio?: string | null
          company_description?: string | null
          company_facebook?: string | null
          company_industry?: string | null
          company_instagram?: string | null
          company_linkedin?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_tiktok?: string | null
          company_twitter?: string | null
          company_website?: string | null
          company_whatsapp?: string | null
          company_youtube?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          full_name?: string | null
          id?: string
          intro_video_url?: string | null
          last_active_at?: string | null
          location?: string | null
          resume_url?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json
          created_at: string
          email: string
          id: string
          message: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_certificates: {
        Row: {
          created_at: string
          credential_url: string | null
          id: string
          issuer: string
          name: string
          updated_at: string
          user_id: string
          year: string
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          id?: string
          issuer?: string
          name?: string
          updated_at?: string
          user_id: string
          year?: string
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          id?: string
          issuer?: string
          name?: string
          updated_at?: string
          user_id?: string
          year?: string
        }
        Relationships: []
      }
      user_education: {
        Row: {
          created_at: string
          degree: string
          end_year: string
          field: string
          id: string
          school: string
          start_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string
          end_year?: string
          field?: string
          id?: string
          school?: string
          start_year?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string
          end_year?: string
          field?: string
          id?: string
          school?: string
          start_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string
          reporter_user_id?: string
          status?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      notification_type:
        | "follow"
        | "message"
        | "like"
        | "comment"
        | "application"
      report_reason:
        | "spam"
        | "harassment"
        | "inappropriate_content"
        | "fake_job_scam"
        | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      notification_type: [
        "follow",
        "message",
        "like",
        "comment",
        "application",
      ],
      report_reason: [
        "spam",
        "harassment",
        "inappropriate_content",
        "fake_job_scam",
        "other",
      ],
    },
  },
} as const

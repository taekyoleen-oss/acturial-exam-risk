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
    PostgrestVersion: "14.4"
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
      act_user_profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          status: string
          created_at: string
          approved_at: string | null
          rejected_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          status?: string
          created_at?: string
          approved_at?: string | null
          rejected_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          status?: string
          created_at?: string
          approved_at?: string | null
          rejected_at?: string | null
        }
        Relationships: []
      }
      act_kidi_reports: {
        Row: {
          created_at: string
          error_msg: string | null
          exam_relevance: string
          file_no: number | null
          id: string
          issue_no: number
          key_points: Json
          processed_at: string | null
          published_month: string | null
          source_file: string
          status: string
          study_notes: string | null
          summary: string | null
          tags: string[]
          title: string
          topic_category: string | null
        }
        Insert: {
          created_at?: string
          error_msg?: string | null
          exam_relevance?: string
          file_no?: number | null
          id?: string
          issue_no: number
          key_points?: Json
          processed_at?: string | null
          published_month?: string | null
          source_file: string
          status?: string
          study_notes?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          topic_category?: string | null
        }
        Update: {
          created_at?: string
          error_msg?: string | null
          exam_relevance?: string
          file_no?: number | null
          id?: string
          issue_no?: number
          key_points?: Json
          processed_at?: string | null
          published_month?: string | null
          source_file?: string
          status?: string
          study_notes?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          topic_category?: string | null
        }
        Relationships: []
      }
      act_ai_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          question_key: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question_key: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      act_news_sources: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      act_past_questions: {
        Row: {
          answer: string | null
          created_at: string
          explanation: string | null
          has_formula: boolean
          id: string
          options: Json
          question_no: number
          question_text: string
          session: string
          source_pdf: string | null
          subject: string
          tags: string[] | null
          year: number
        }
        Insert: {
          answer?: string | null
          created_at?: string
          explanation?: string | null
          has_formula?: boolean
          id?: string
          options?: Json
          question_no: number
          question_text: string
          session?: string
          source_pdf?: string | null
          subject?: string
          tags?: string[] | null
          year: number
        }
        Update: {
          answer?: string | null
          created_at?: string
          explanation?: string | null
          has_formula?: boolean
          id?: string
          options?: Json
          question_no?: number
          question_text?: string
          session?: string
          source_pdf?: string | null
          subject?: string
          tags?: string[] | null
          year?: number
        }
        Relationships: []
      }
      act_pdf_imports: {
        Row: {
          completed_at: string | null
          error_msg: string | null
          filename: string
          id: string
          question_count: number | null
          session: string
          status: string
          uploaded_at: string
          year: number
        }
        Insert: {
          completed_at?: string | null
          error_msg?: string | null
          filename: string
          id?: string
          question_count?: number | null
          session?: string
          status?: string
          uploaded_at?: string
          year: number
        }
        Update: {
          completed_at?: string | null
          error_msg?: string | null
          filename?: string
          id?: string
          question_count?: number | null
          session?: string
          status?: string
          uploaded_at?: string
          year?: number
        }
        Relationships: []
      }
      act_rag_embeddings: {
        Row: {
          chapter: number | null
          chapter_title: string | null
          chunk_index: number
          content: string
          created_at: string
          embedding: string
          has_formula: boolean
          id: string
          page_start: number | null
          section: string | null
          textbook_id: string
        }
        Insert: {
          chapter?: number | null
          chapter_title?: string | null
          chunk_index: number
          content: string
          created_at?: string
          embedding: string
          has_formula?: boolean
          id?: string
          page_start?: number | null
          section?: string | null
          textbook_id: string
        }
        Update: {
          chapter?: number | null
          chapter_title?: string | null
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string
          has_formula?: boolean
          id?: string
          page_start?: number | null
          section?: string | null
          textbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_rag_embeddings_textbook_id_fkey"
            columns: ["textbook_id"]
            isOneToOne: false
            referencedRelation: "act_rag_textbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      act_rag_textbooks: {
        Row: {
          checksum: string | null
          edition: string | null
          id: string
          source_file: string | null
          subject: string
          title: string
          total_chunks: number | null
          uploaded_at: string
          year: number | null
        }
        Insert: {
          checksum?: string | null
          edition?: string | null
          id?: string
          source_file?: string | null
          subject?: string
          title: string
          total_chunks?: number | null
          uploaded_at?: string
          year?: number | null
        }
        Update: {
          checksum?: string | null
          edition?: string | null
          id?: string
          source_file?: string | null
          subject?: string
          title?: string
          total_chunks?: number | null
          uploaded_at?: string
          year?: number | null
        }
        Relationships: []
      }
      act_weekly_issues: {
        Row: {
          articles: Json
          generated_at: string | null
          id: string
          issue_date: string
          questions: Json
          status: string
          week_label: string
        }
        Insert: {
          articles?: Json
          generated_at?: string | null
          id?: string
          issue_date: string
          questions?: Json
          status?: string
          week_label: string
        }
        Update: {
          articles?: Json
          generated_at?: string | null
          id?: string
          issue_date?: string
          questions?: Json
          status?: string
          week_label?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_rag_chunks: {
        Args: {
          match_count?: number
          match_subject: string
          query_embedding: string
        }
        Returns: {
          chapter_title: string
          content: string
          has_formula: boolean
          id: string
          section: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// Generated from the Supabase project schema (supabase/migrations). Regenerate after each migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];


export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      admins: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
      categories: {
        Row: { id: number; name: string; slug: string };
        Insert: { id?: never; name: string; slug: string };
        Update: { id?: never; name?: string; slug?: string };
        Relationships: [];
      };
      chapters: {
        Row: {
          body: string; created_at: string; fic_id: number; id: number; notes_after: string; notes_before: string;
          position: number; publish_at: string | null; title: string | null; updated_at: string; word_count: number;
        };
        Insert: {
          body?: string; created_at?: string; fic_id: number; id?: never; notes_after?: string; notes_before?: string;
          position: number; publish_at?: string | null; title?: string | null; updated_at?: string; word_count?: number;
        };
        Update: {
          body?: string; created_at?: string; fic_id?: number; id?: never; notes_after?: string; notes_before?: string;
          position?: number; publish_at?: string | null; title?: string | null; updated_at?: string; word_count?: number;
        };
        Relationships: [
          { foreignKeyName: "chapters_fic_id_fkey"; columns: ["fic_id"]; isOneToOne: false; referencedRelation: "fics"; referencedColumns: ["id"] },
        ];
      };
      fic_tags: {
        Row: { fic_id: number; tag_id: number };
        Insert: { fic_id: number; tag_id: number };
        Update: { fic_id?: number; tag_id?: number };
        Relationships: [
          { foreignKeyName: "fic_tags_fic_id_fkey"; columns: ["fic_id"]; isOneToOne: false; referencedRelation: "fics"; referencedColumns: ["id"] },
          { foreignKeyName: "fic_tags_tag_id_fkey"; columns: ["tag_id"]; isOneToOne: false; referencedRelation: "tags"; referencedColumns: ["id"] },
        ];
      };
      fics: {
        Row: {
          category_id: number; cover_path: string | null; created_at: string; featured: boolean; id: number; notes: string; publish_at: string | null;
          rating: Database["public"]["Enums"]["rating"]; slug: string; status: Database["public"]["Enums"]["fic_status"];
          summary: string; title: string; updated_at: string;
        };
        Insert: {
          category_id: number; cover_path?: string | null; created_at?: string; featured?: boolean; id?: never; notes?: string; publish_at?: string | null;
          rating?: Database["public"]["Enums"]["rating"]; slug: string; status?: Database["public"]["Enums"]["fic_status"];
          summary?: string; title: string; updated_at?: string;
        };
        Update: {
          category_id?: number; cover_path?: string | null; created_at?: string; featured?: boolean; id?: never; notes?: string; publish_at?: string | null;
          rating?: Database["public"]["Enums"]["rating"]; slug?: string; status?: Database["public"]["Enums"]["fic_status"];
          summary?: string; title?: string; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "fics_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      pages: {
        Row: { body: string; slug: string; title: string; updated_at: string };
        Insert: { body?: string; slug: string; title: string; updated_at?: string };
        Update: { body?: string; slug?: string; title?: string; updated_at?: string };
        Relationships: [];
      };
      post_images: {
        Row: { caption: string; id: number; path: string; position: number; post_id: number };
        Insert: { caption?: string; id?: never; path: string; position: number; post_id: number };
        Update: { caption?: string; id?: never; path?: string; position?: number; post_id?: number };
        Relationships: [
          { foreignKeyName: "post_images_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
        ];
      };
      post_tags: {
        Row: { post_id: number; tag_id: number };
        Insert: { post_id: number; tag_id: number };
        Update: { post_id?: number; tag_id?: number };
        Relationships: [
          { foreignKeyName: "post_tags_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
          { foreignKeyName: "post_tags_tag_id_fkey"; columns: ["tag_id"]; isOneToOne: false; referencedRelation: "tags"; referencedColumns: ["id"] },
        ];
      };
      posts: {
        Row: {
          body: string; category_id: number; created_at: string; embed_url: string | null; id: number;
          publish_at: string | null; slug: string; title: string; updated_at: string;
        };
        Insert: {
          body?: string; category_id: number; created_at?: string; embed_url?: string | null; id?: never;
          publish_at?: string | null; slug: string; title: string; updated_at?: string;
        };
        Update: {
          body?: string; category_id?: number; created_at?: string; embed_url?: string | null; id?: never;
          publish_at?: string | null; slug?: string; title?: string; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "posts_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      upload_files: {
        Row: { chapter_id: number | null; created_at: string; error: string | null; fic_id: number | null; filename: string; id: number; kind: string; size: number; status: string; storage_path: string };
        Insert: { chapter_id?: number | null; created_at?: string; error?: string | null; fic_id?: number | null; filename: string; id?: never; kind: string; size?: number; status: string; storage_path: string };
        Update: { chapter_id?: number | null; created_at?: string; error?: string | null; fic_id?: number | null; filename?: string; id?: never; kind?: string; size?: number; status?: string; storage_path?: string };
        Relationships: [];
      };
      chapter_versions: {
        Row: { body: string; chapter_id: number; created_at: string; id: number; notes_after: string; notes_before: string; reason: string; title: string | null; word_count: number };
        Insert: { body?: string; chapter_id: number; created_at?: string; id?: never; notes_after?: string; notes_before?: string; reason: string; title?: string | null; word_count?: number };
        Update: { body?: string; chapter_id?: number; created_at?: string; id?: never; notes_after?: string; notes_before?: string; reason?: string; title?: string | null; word_count?: number };
        Relationships: [];
      };
      preview_links: {
        Row: { chapter_id: number; created_at: string; revoked_at: string | null; token: string };
        Insert: { chapter_id: number; created_at?: string; revoked_at?: string | null; token?: string };
        Update: { chapter_id?: number; created_at?: string; revoked_at?: string | null; token?: string };
        Relationships: [];
      };
      tags: {
        Row: { id: number; name: string; slug: string; type: Database["public"]["Enums"]["tag_type"] };
        Insert: { id?: never; name: string; slug: string; type: Database["public"]["Enums"]["tag_type"] };
        Update: { id?: never; name?: string; slug?: string; type?: Database["public"]["Enums"]["tag_type"] };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      preview_chapter: {
        Args: { p_token: string };
        Returns: { fic_title: string; chapter_title: string | null; chapter_position: number; notes_before: string; body: string; notes_after: string; word_count: number }[];
      };
    };
    Enums: {
      fic_status: "in_progress" | "complete";
      rating: "general" | "teen" | "mature" | "explicit" | "not_rated";
      tag_type: "fandom" | "character" | "relationship" | "warning" | "freeform";
    };
    CompositeTypes: { [_ in never]: never };
  };
};


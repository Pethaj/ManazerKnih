export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          created_at: string
          title: string
          author: string
          publication_year: number | null
          publisher: string
          summary: string
          keywords: string[]
          language: string
          format: string
          file_size: number
          cover_image_url: string
          publication_types: string[]
          labels: string[]
          categories: string[]
          file_path: string
          OCR: boolean
          Vdtb: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          author?: string
          publication_year?: number | null
          publisher?: string
          summary?: string
          keywords?: string[]
          language?: string
          format: string
          file_size: number
          cover_image_url: string
          publication_types?: string[]
          labels?: string[]
          categories?: string[]
          file_path: string
          OCR?: boolean
          Vdtb?: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          author?: string
          publication_year?: number | null
          publisher?: string
          summary?: string
          keywords?: string[]
          language?: string
          format?: string
          file_size?: number
          cover_image_url?: string
          publication_types?: string[]
          labels?: string[]
          categories?: string[]
          file_path?: string
          OCR?: boolean
          Vdtb?: string
        }
        Relationships: []
      }
      labels: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          id: string
          name: string
          code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      publication_types: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

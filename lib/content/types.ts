import type { Database } from "@/lib/supabase/database.types";

type T = Database["public"]["Tables"];
export type Rating = Database["public"]["Enums"]["rating"];
export type FicStatus = Database["public"]["Enums"]["fic_status"];
export type TagType = Database["public"]["Enums"]["tag_type"];

export type Category = T["categories"]["Row"];
export type Tag = T["tags"]["Row"];
export type Fic = T["fics"]["Row"];
export type Chapter = T["chapters"]["Row"];
export type Post = T["posts"]["Row"];
export type PostImage = T["post_images"]["Row"];
export type Page = T["pages"]["Row"];

export const RATING_LABELS: Record<Rating, string> = {
  general: "General", teen: "Teen", mature: "Mature", explicit: "Explicit", not_rated: "Not Rated",
};
export const STATUS_LABELS: Record<FicStatus, string> = { in_progress: "In progress", complete: "Complete" };
export const TAG_TYPE_LABELS: Record<TagType, string> = {
  fandom: "Fandom", character: "Characters", relationship: "Relationships", warning: "Warnings", freeform: "Tags",
};
export const TAG_TYPES: TagType[] = ["fandom", "relationship", "character", "warning", "freeform"];

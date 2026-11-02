import Link from "next/link";
import { TAG_TYPE_LABELS, TAG_TYPES, type Tag } from "@/lib/content/types";

export default function TagList({ tags }: { tags: Tag[] }) {
  const groups = TAG_TYPES.map((type) => ({ type, tags: tags.filter((t) => t.type === type) })).filter((g) => g.tags.length);
  if (!groups.length) return null;
  return (
    <dl className="tag-list">
      {groups.map((g) => (
        <div className="tag-group" key={g.type}>
          <dt>{TAG_TYPE_LABELS[g.type]}</dt>
          <dd>
            <ul>
              {g.tags.map((t) => (
                <li key={t.id}><Link href={`/tags/${t.type}/${t.slug}`}>{t.name}</Link></li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Unique pastel background color per tag type. Text color chosen for readability.
 */
const TAG_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  "cafe/bakery": { backgroundColor: "#fef3c7", color: "#92400e" },
  "food truck": { backgroundColor: "#fed7aa", color: "#9a3412" },
  coffee: { backgroundColor: "#e0e7ff", color: "#3730a3" },
  bar: { backgroundColor: "#fce7f3", color: "#9d174d" },
  club: { backgroundColor: "#ddd6fe", color: "#5b21b6" },
  "activity location": { backgroundColor: "#ccfbf1", color: "#0f766e" },
  viewpoint: { backgroundColor: "#dbeafe", color: "#1e40af" },
  restaurant: { backgroundColor: "#d1fae5", color: "#065f46" },
};

export function getTagColor(tag: string): { backgroundColor: string; color: string } {
  return (
    TAG_COLORS[tag] ?? { backgroundColor: "#f3f4f6", color: "#4b5563" }
  );
}

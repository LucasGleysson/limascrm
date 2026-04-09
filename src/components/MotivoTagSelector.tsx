import { Badge } from "@/components/ui/badge";

interface Props {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  variant?: "destructive" | "default";
}

export const MotivoTagSelector = ({ tags, selected, onToggle, variant = "destructive" }: Props) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <Badge
            key={tag}
            variant={isSelected ? variant : "outline"}
            className={`cursor-pointer text-xs py-1 px-3 transition-all ${
              isSelected
                ? variant === "destructive"
                  ? ""
                  : ""
                : "opacity-70 hover:opacity-100"
            }`}
            onClick={() => onToggle(tag)}
          >
            {tag}
          </Badge>
        );
      })}
    </div>
  );
};

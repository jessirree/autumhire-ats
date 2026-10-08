import { useMemo, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import type { Skill } from '../../services/skillService';

interface SkillPickerProps {
  /** All skills, including inactive — needed to resolve names for ids already selected. */
  allSkills: Skill[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Searchable multi-select over the Skills taxonomy (candidate-matching spec
 * §2.1) — never a dropdown, and free text is never accepted as a selection:
 * every chip is a real Skills document id, chosen from the list, not typed.
 * Already-selected skills resolve against the FULL list (including
 * deactivated ones), so a skill picked before it was deactivated keeps
 * showing its name instead of silently dropping off the profile; the search
 * popover only offers active skills as new choices.
 */
export function SkillPicker({ allSkills, selectedIds, onChange, disabled, placeholder }: SkillPickerProps) {
  const [open, setOpen] = useState(false);

  const byId = useMemo(() => new Map(allSkills.map((s) => [s.id, s])), [allSkills]);
  const selected = selectedIds.map((id) => byId.get(id)).filter((s): s is Skill => !!s);
  const selectableOptions = useMemo(
    () => allSkills.filter((s) => s.active && !selectedIds.includes(s.id)),
    [allSkills, selectedIds]
  );

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.map((skill) => (
          <Badge key={skill.id} variant={skill.active ? 'secondary' : 'outline'} className="gap-1">
            {skill.name}
            {!skill.active && <span className="text-muted-foreground">(inactive)</span>}
            {!disabled && (
              <button
                type="button"
                onClick={() => toggle(skill.id)}
                className="ml-0.5 rounded-full hover:bg-black/10"
                aria-label={`Remove ${skill.name}`}
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
        {selected.length === 0 && (
          <span className="text-sm text-muted-foreground">No skills added yet.</span>
        )}
      </div>

      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={open}
              className="justify-between font-normal"
            >
              {placeholder || 'Add a skill…'}
              <ChevronsUpDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search skills..." />
              <CommandList>
                <CommandEmpty>No matching skill.</CommandEmpty>
                <CommandGroup>
                  {selectableOptions.map((skill) => (
                    <CommandItem key={skill.id} value={skill.name} onSelect={() => toggle(skill.id)}>
                      {skill.name}
                      {skill.department && (
                        <span className="ml-auto text-xs text-muted-foreground">{skill.department}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

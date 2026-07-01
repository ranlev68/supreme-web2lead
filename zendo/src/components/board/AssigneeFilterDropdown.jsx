import { useState } from "react";
import { X, ChevronDown, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AssigneeFilterDropdown({ members, value, onChange }) {
  const selected = members.find(m => m.user_email === value);

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            value
              ? "bg-white/30 text-white shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          {selected ? (
            <>
              <span className="h-4 w-4 rounded-full bg-white/30 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                {initials(selected.user_name || selected.user_email)}
              </span>
              <span className="hidden sm:inline max-w-[80px] truncate">{selected.user_name || selected.user_email}</span>
              <span
                onClick={handleClear}
                className="ml-0.5 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </>
          ) : (
            <>
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">All members</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="text-xs gap-2"
        >
          <span className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 shrink-0">
            <UserCheck className="h-3.5 w-3.5" />
          </span>
          All members
          {!value && <span className="ml-auto text-blue-500">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {members.map(m => (
          <DropdownMenuItem
            key={m.user_email}
            onClick={() => onChange(m.user_email)}
            className="text-xs gap-2"
          >
            <span className="h-6 w-6 rounded-full bg-[#0079BF] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {initials(m.user_name || m.user_email)}
            </span>
            <span className="truncate">{m.user_name || m.user_email}</span>
            {value === m.user_email && <span className="ml-auto text-blue-500">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
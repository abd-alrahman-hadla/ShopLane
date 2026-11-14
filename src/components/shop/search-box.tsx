import Form from "next/form";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBoxProps = {
  defaultValue?: string;
  className?: string;
};

/** GET form to /search. Works without JavaScript; next/form adds client navigation. */
export function SearchBox({ defaultValue, className }: SearchBoxProps) {
  return (
    <Form action="/search" role="search" className={cn("relative", className)}>
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        id="site-search"
        name="q"
        type="search"
        placeholder="Search coffee & gear"
        defaultValue={defaultValue}
        className="h-9 pl-8"
        maxLength={100}
      />
    </Form>
  );
}

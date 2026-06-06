import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional actions rendered on the right (buttons, selectors). */
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-text-primary">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

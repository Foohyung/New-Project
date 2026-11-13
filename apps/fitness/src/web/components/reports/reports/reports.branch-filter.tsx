'use client';

import { UrlDropdown } from '@/web/components/ui/ui/ui.url-dropdown';
import { hrefWith, type Params } from '@/web/components/ui/ui/ui.view-switch';

export function ReportBranchFilter({ branches, selected, params, allLabel }: {
  branches: string[];
  selected: string | null;
  params: Params;
  allLabel: string;
}) {
  const options = [
    { value: '', label: allLabel, href: hrefWith('/reports', params, { branch: undefined }) },
    ...branches.map(branch => ({
      value: branch,
      label: branch,
      href: hrefWith('/reports', params, { branch }),
    })),
  ];
  return <UrlDropdown options={options} value={selected ?? ''} label="สาขา" />;
}

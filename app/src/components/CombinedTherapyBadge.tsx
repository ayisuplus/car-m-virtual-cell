import { Pill, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CarDesign } from '@/types/simulation';

interface CombinedTherapyBadgeProps {
  isActive: boolean;
  carDesign: CarDesign;
}

export default function CombinedTherapyBadge({ isActive, carDesign }: CombinedTherapyBadgeProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md glass-panel w-fit">
      <Pill className="w-3 h-3 text-cyan-400" />
      <Badge
        variant="outline"
        className="text-[10px] border-cyan-400/40 text-cyan-400 bg-cyan-400/10"
      >
        CAR-M
      </Badge>
      <Badge
        variant="outline"
        className="text-[10px] border-emerald-400/40 text-emerald-400 bg-emerald-400/10"
      >
        α-PD-1
      </Badge>
      {carDesign.checkpointBlockade.CD47_SIRPa && (
        <Badge
          variant="outline"
          className="text-[10px] border-purple-400/40 text-purple-400 bg-purple-400/10"
        >
          <Shield className="w-3 h-3 mr-0.5" />
          α-CD47
        </Badge>
      )}
    </div>
  );
}

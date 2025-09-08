
import KidsMode from "@/components/client/kids-mode";
import { Toaster } from "@/components/ui/toaster";

export default function KidsPage() {
  return (
    <div className="kids-theme">
      <KidsMode />
      <Toaster />
    </div>
  );
}

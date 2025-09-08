import StoryMode from "@/components/client/story-mode";
import { Toaster } from "@/components/ui/toaster";

export default function StoryPage() {
  return (
    <div className="story-theme">
      <StoryMode />
      <Toaster />
    </div>
  );
}

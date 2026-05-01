import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Upload as UploadIcon, FileText, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/upload")({
  component: UploadPage,
});

function UploadPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onFile = (f: File | null) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file");
    if (!title.trim()) return toast.error("Title is required");
    if (!user) return toast.error("Not signed in");

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) return toast.error("Only images or PDF files are allowed");
    if (file.size > 15 * 1024 * 1024) return toast.error("File must be under 15 MB");

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || (isPdf ? "pdf" : "png");
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("arrangements")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("arrangements").getPublicUrl(path);

      const { error: insErr } = await supabase.from("arrangements").insert({
        title: title.trim(),
        note: note.trim() || null,
        file_url: pub.publicUrl,
        file_path: path,
        file_type: isImage ? "image" : "pdf",
        arrangement_date: date,
        is_active: active,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;
      toast.success("Arrangement uploaded");
      nav({ to: "/admin/arrangements" });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Upload Arrangement</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 p-8 text-center transition-colors hover:border-gold/60 hover:bg-muted"
        >
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="max-h-64 rounded-lg object-contain" />
          ) : file ? (
            <>
              <FileText className="h-10 w-10 text-muted-foreground" />
              <div className="text-sm font-medium">{file.name}</div>
            </>
          ) : (
            <>
              <UploadIcon className="h-10 w-10 text-muted-foreground" />
              <div>
                <div className="font-medium">Click to choose a file</div>
                <div className="text-xs text-muted-foreground">PNG, JPG or PDF · up to 15 MB</div>
              </div>
            </>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Arrangement for 2 May" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional information for staff or students" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
          <div>
            <div className="text-sm font-medium">Set as active</div>
            <div className="text-xs text-muted-foreground">
              The previously active arrangement will be archived automatically.
            </div>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="w-full bg-primary text-primary-foreground hover:opacity-90">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? "Uploading…" : "Upload arrangement"}
        </Button>
      </form>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" /> Tip: high-resolution images look best on smartboards.
      </div>
    </div>
  );
}

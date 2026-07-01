import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, ArrowLeft } from "lucide-react";
import ImageCropModal from "@/components/ImageCropModal";

const CACHE_KEY = "zendo_user_cache";

function getCachedUser() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)); } catch { return null; }
}
function setCachedUser(u) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(u)); } catch {}
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ profile_picture: "", full_name: "", email: "", job_title: "", department: "", bio: "" });
  const [cropFile, setCropFile] = useState(null);

  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setForm({
        profile_picture: cached.profile_picture || "",
        full_name: cached.full_name || "",
        email: cached.email || "",
        job_title: cached.job_title || "",
        department: cached.department || "",
        bio: cached.bio || "",
      });
      setLoading(false);
    }
    // Always refresh in background
    base44.auth.me().then((u) => {
      setCachedUser(u);
      setUser(u);
      setForm({
        profile_picture: u.profile_picture || "",
        full_name: u.full_name || "",
        email: u.email || "",
        job_title: u.job_title || "",
        department: u.department || "",
        bio: u.bio || "",
      });
      setLoading(false);
    });
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCropFile(file);
  };

  const handleCropConfirm = async (croppedFile) => {
    setCropFile(null);
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: croppedFile });
      setForm((prev) => ({ ...prev, profile_picture: file_url }));
      await base44.auth.updateMe({ profile_picture: file_url });
      const updated = { ...user, profile_picture: file_url };
      setCachedUser(updated);
      setUser(updated);
      window.dispatchEvent(new Event("zendo_user_updated"));
    } catch (e) {
      console.error(e);
      alert("Couldn't upload photo: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ job_title: form.job_title, department: form.department, bio: form.bio });
      setCachedUser({ ...user, job_title: form.job_title, department: form.department, bio: form.bio });
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("Couldn't save profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const initials = form.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || form.email[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {cropFile && <ImageCropModal file={cropFile} onConfirm={handleCropConfirm} onCancel={() => setCropFile(null)} />}

      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Profile Picture */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Profile Picture</label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-gray-200">
                  {form.profile_picture && <AvatarImage src={form.profile_picture} alt={form.full_name} />}
                  <AvatarFallback className="bg-[#0079BF] text-white text-lg font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading || saving} className="hidden" />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium cursor-pointer">
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4" />Change Picture</>}
                  </span>
                </label>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Full Name</label>
              <Input value={form.full_name} disabled className="bg-gray-100 text-gray-600 cursor-not-allowed" />
              <p className="text-xs text-gray-500">This field is managed by your account settings.</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Email</label>
              <Input type="email" value={form.email} disabled className="bg-gray-100 text-gray-600 cursor-not-allowed" />
              <p className="text-xs text-gray-500">Your email cannot be changed.</p>
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Job Title</label>
              <Input value={form.job_title} onChange={(e) => setForm((p) => ({ ...p, job_title: e.target.value }))} placeholder="e.g., Product Manager" className="bg-white" />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Department</label>
              <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="e.g., Product" className="bg-white" />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Bio</label>
              <Textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." className="bg-white min-h-[100px]" dir="auto" />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={saving || uploading}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || uploading} className="bg-[#0079BF] hover:bg-[#026AA7] text-white">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
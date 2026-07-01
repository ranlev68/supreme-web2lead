import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Upload, X, Image, FileText, Loader2 } from "lucide-react";

export default function AIChecklistGenerator({ open, onClose, onGenerated }) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [imageName, setImageName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setImageName(file.name);
    setUploading(false);
    e.target.value = "";
  };

  const handleGenerate = async () => {
    if (!text.trim() && !imageUrl) return;
    setGenerating(true);

    const prompt = `You are a project management assistant. Extract actionable tasks/checklist items from the following content.
Return ONLY a JSON array of strings, each string being a concise actionable task.
Do not add explanations. Do not number them. Just the tasks.

Content:
${text || "(see attached image)"}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: imageUrl ? [imageUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "string" } }
        },
        required: ["items"]
      }
    });

    setGenerating(false);
    if (result?.items?.length) {
      onGenerated(result.items);
      handleClose();
    }
  };

  const handleClose = () => {
    setText("");
    setImageUrl(null);
    setImageName("");
    onClose();
  };

  const canGenerate = (text.trim() || imageUrl) && !generating && !uploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">AI Checklist Generator</h2>
              <p className="text-xs text-gray-500">From meeting notes, whiteboard, or any text</p>
            </div>
          </div>
          <button onClick={handleClose} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Text input */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Paste your notes
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste meeting notes, a summary, action items, or any text..."
              className="bg-gray-50 min-h-[120px] text-sm resize-none"
              dir="auto"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            or
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Image upload */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Upload an image (whiteboard, screenshot...)
            </label>
            {imageUrl ? (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <img src={imageUrl} alt={imageName} className="h-10 w-14 object-cover rounded" />
                <span className="text-xs text-gray-700 flex-1 truncate">{imageName}</span>
                <button onClick={() => { setImageUrl(null); setImageName(""); }} className="text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg py-5 flex flex-col items-center gap-2 text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                <span className="text-xs">{uploading ? "Uploading..." : "Click to upload image"}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating checklist...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Checklist
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
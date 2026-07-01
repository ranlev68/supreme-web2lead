import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Upload, Loader2, Check, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ImageToCard({ list, boardId, cards, onRefresh }) {
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [pendingCards, setPendingCards] = useState(null); // array of {title} to confirm
  const [checked, setChecked] = useState([]);

  const processFile = async (file) => {
    if (!file) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Look at this image carefully. Extract all distinct task or card titles from it.
If the image contains a list of items, tasks, or rows — return each one as a separate card title.
If it contains only a single item or text, return just one card.
Return clean, concise titles (not full sentences unless needed).`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    });

    const titles = (result?.cards || []).map((t) => t.trim()).filter(Boolean);
    if (titles.length > 0) {
      setPendingCards(titles);
      setChecked(titles.map(() => true));
    }
    setLoading(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await processFile(file);
  };

  const confirmCreate = async () => {
    const toCreate = pendingCards.filter((_, i) => checked[i]);
    const maxPos = cards.length > 0 ? Math.max(...cards.map((c) => c.position)) : 0;
    for (let i = 0; i < toCreate.length; i++) {
      await base44.entities.Card.create({
        title: toCreate[i],
        list_id: list.id,
        board_id: boardId,
        position: maxPos + (i + 1) * 1000,
      });
    }
    setPendingCards(null);
    setChecked([]);
    onRefresh();
  };

  const cancel = () => {
    setPendingCards(null);
    setChecked([]);
  };

  const toggleCheck = (i) => {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Trigger button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={loading}
            title="Create card(s) from image"
            className="flex items-center justify-center p-1.5 text-gray-500 hover:bg-gray-300/50 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4 mr-2" /> Take a photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => uploadRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Upload image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation dialog */}
      {pendingCards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Create {pendingCards.length} card{pendingCards.length > 1 ? "s" : ""}?
            </h3>
            <p className="text-xs text-gray-500 mb-3">Uncheck any you don't want to create.</p>
            <ul className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
              {pendingCards.map((title, i) => (
                <li
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    checked[i] ? "bg-blue-50 border border-blue-200 text-gray-800" : "bg-gray-50 border border-gray-200 text-gray-400 line-through"
                  }`}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked[i] ? "bg-[#0079BF] border-[#0079BF]" : "border-gray-300"}`}>
                    {checked[i] && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  {title}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#0079BF] hover:bg-[#026AA7] text-white flex-1"
                onClick={confirmCreate}
                disabled={!checked.some(Boolean)}
              >
                Create {checked.filter(Boolean).length} card{checked.filter(Boolean).length !== 1 ? "s" : ""}
              </Button>
              <Button size="sm" variant="outline" onClick={cancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
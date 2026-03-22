import { UploadCloud, FileText, Wand2, BookOpen, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function CreateCourse() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-top-4 duration-500">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight flex items-center justify-center gap-3">
          <Wand2 className="text-pink-400 w-8 h-8" />
          The Forging Anvil (Course Generator)
        </h1>
        <p className="text-slate-400 text-lg">Offer an ancient tome (PDF), and our mystical agents will deconstruct it into bite-sized quests.</p>
      </div>

      <Card className="border-pink-500/30 bg-slate-900/60 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-600/5 pointer-events-none" />
        <CardHeader className="text-center relative z-10">
          <CardTitle className="text-2xl text-pink-100">Summon New Knowledge</CardTitle>
          <CardDescription>Upload a manuscript. The archmages will handle the rest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 relative z-10 p-8">
          
          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-700/60 rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-pink-500/50 hover:bg-slate-800/30 transition-all cursor-pointer group group/upload">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center group-hover/upload:scale-110 transition-transform shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <UploadCloud className="w-10 h-10 text-pink-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-slate-200">Drop your grimoire here</p>
              <p className="text-sm text-slate-500 mt-1">PDF format only, up to 50MB</p>
            </div>
            <Button variant="outline" className="mt-4 border-pink-500/50 text-pink-400 hover:bg-pink-950">
              Browse Tomes
            </Button>
          </div>

          {/* Explanation Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-200">1. Offering</h4>
              <p className="text-xs text-slate-400">The sacred text is received and stored securely in the vaults.</p>
            </div>
            
            <div className="text-center space-y-3 relative">
              <div className="hidden md:block absolute top-6 left-0 w-full h-0.5 bg-slate-800 -z-10" />
              <div className="w-12 h-12 mx-auto bg-purple-900/30 rounded-full flex items-center justify-center border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-200">2. Deconstruction</h4>
              <p className="text-xs text-slate-400">Multiple arcane agents parse the text to extract core concepts.</p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-200">3. Quest Creation</h4>
              <p className="text-xs text-slate-400">Digestible segments, trials, and lore are forged into a course.</p>
            </div>
          </div>
          
          <div className="flex justify-center pt-6">
            <Button variant="fantasy" size="lg" className="px-12 text-lg disabled:opacity-50 group" disabled>
              <Wand2 className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
              Initiate Ritual (Upload to Begin)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

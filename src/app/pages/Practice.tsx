import { Terminal, Play, Save, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";

export function Practice() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Terminal className="text-emerald-400 w-8 h-8" />
            The Proving Grounds (Arena)
          </h1>
          <p className="text-slate-400">Test your incantations in a safe environment.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-slate-400 hover:text-white">
            <RotateCcw className="w-4 h-4" /> Reset Runes
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-blue-400 hover:bg-blue-950 hover:border-blue-800">
            <Save className="w-4 h-4" /> Save Scroll
          </Button>
          <Button variant="fantasy" size="sm" className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]">
            <Play className="w-4 h-4 fill-current" /> Cast Spell (Run)
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Challenge Description Panel */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="flex-1 bg-slate-900/60 rounded-xl border border-slate-800 p-6 flex flex-col overflow-y-auto custom-scrollbar backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">Quest #42</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">Difficulty: Medium</span>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-4">The Recursive Labyrinth</h2>
            
            <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed mb-6">
              <p>The maze requires a special sequence to traverse. You must write an incantation (function) that calls upon itself to find the exit.</p>
              <p><strong>Objective:</strong> Write a function <code>traverseMaze(depth)</code> that returns the total number of paths checked.</p>
            </div>
            
            <div className="mt-auto p-4 bg-slate-950 rounded-lg border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400" /> Hints from the Archmage
              </h3>
              <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside">
                <li>Remember your base case to prevent an infinite void.</li>
                <li>Each step doubles the potential paths.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Editor & Console Panel */}
        <div className="w-2/3 flex flex-col gap-4">
          {/* Mock Editor */}
          <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative">
            <div className="h-10 bg-[#2d2d2d] flex items-center px-4 border-b border-black shrink-0">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="mx-auto text-xs text-slate-400 font-mono">spellbook.js</span>
            </div>
            <div className="flex-1 p-4 font-mono text-sm text-[#d4d4d4] overflow-y-auto">
              <pre className="m-0 leading-relaxed">
                <code className="block">
                  <span className="text-[#569cd6]">function</span> <span className="text-[#dcdcaa]">traverseMaze</span>(depth) {'{\n'}
                  <span className="text-[#6a9955]">  // Your code here, traveler.</span>{'\n'}
                  <span className="text-[#6a9955]">  // Beware the infinite loop!</span>{'\n'}
                  {'\n'}
                  {'\n'}
                  {'}\n'}
                </code>
              </pre>
            </div>
          </div>

          {/* Console */}
          <div className="h-48 bg-black rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-inner font-mono relative">
             <div className="h-8 bg-slate-900 flex items-center px-4 shrink-0 border-b border-slate-800 justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Crystal Ball (Output)</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-500 hover:text-white px-2">Clear</Button>
             </div>
             <div className="p-4 text-sm text-green-400 overflow-y-auto">
              {'>'} Awaiting invocation...
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

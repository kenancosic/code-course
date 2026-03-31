import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { useGenerateRoadmap } from '../../hooks';

interface CustomPathGeneratorProps {
  title?: string;
  description?: string;
  className?: string;
}

export function CustomPathGenerator({
  title = 'Generate Custom Path',
  description = 'Enter a topic to generate an AI-driven roadmap tailored to your interests.',
  className,
}: CustomPathGeneratorProps) {
  const navigate = useNavigate();
  const generateRoadmap = useGenerateRoadmap();
  const [customTopic, setCustomTopic] = useState('');

  const handleGeneratePath = async () => {
    if (!customTopic.trim()) return;

    const roadmap = await generateRoadmap.mutateAsync(customTopic.trim());
    navigate(`/roadmap/${roadmap.id}`);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sparkles className="text-primary w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground font-serif">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Input
            placeholder="e.g. Machine Learning, Rust Programming..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            disabled={generateRoadmap.isPending}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleGeneratePath();
              }
            }}
          />
          <Button
            onClick={() => void handleGeneratePath()}
            disabled={generateRoadmap.isPending || !customTopic.trim()}
            className="w-full whitespace-nowrap sm:w-auto"
          >
            {generateRoadmap.isPending ? 'Generating...' : 'Generate Custom Path'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

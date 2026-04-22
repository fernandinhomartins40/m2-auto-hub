import { type ClipboardEvent, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Underline,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  placeholder?: string;
  minHeight?: number;
}

type EditorCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight';

const normalizeHtml = (value: string) => {
  const trimmed = value.trim();
  return trimmed === '<br>' || trimmed === '<div><br></div>' ? '' : value;
};

export function RichTextEditor({
  label,
  value,
  onChange,
  description,
  placeholder = 'Digite o conteúdo...',
  minHeight = 180,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const syncEditorValue = () => {
    if (!editorRef.current) {
      return;
    }

    onChange(normalizeHtml(editorRef.current.innerHTML));
  };

  const runCommand = (command: EditorCommand) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncEditorValue();
  };

  const formatBlock = (tag: 'p' | 'h2') => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, `<${tag}>`);
    syncEditorValue();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    syncEditorValue();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <Tabs value={mode} onValueChange={(next) => setMode(next as 'visual' | 'html')}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => formatBlock('p')}>
              <Pilcrow className="mr-2 h-4 w-4" />
              Parágrafo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => formatBlock('h2')}>
              <Heading2 className="mr-2 h-4 w-4" />
              Título
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('bold')}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('italic')}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('underline')}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('insertUnorderedList')}>
              <List className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('insertOrderedList')}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('justifyLeft')}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('justifyCenter')}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => runCommand('justifyRight')}>
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>

          <TabsList className="w-full lg:w-auto">
            <TabsTrigger value="visual" className="flex-1 lg:flex-none">
              Visual
            </TabsTrigger>
            <TabsTrigger value="html" className="flex-1 lg:flex-none">
              HTML
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="mt-0">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncEditorValue}
            onBlur={syncEditorValue}
            onPaste={handlePaste}
            data-placeholder={placeholder}
            className="min-h-[180px] rounded-md border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&:empty:before]:text-muted-foreground [&:empty:before]:content-[attr(data-placeholder)] [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
            style={{ minHeight }}
          />
        </TabsContent>

        <TabsContent value="html" className="mt-0">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-[180px] font-mono text-xs"
            style={{ minHeight }}
            placeholder="<p><strong>M2 Center Auto</strong></p>"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

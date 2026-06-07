import { useState, useMemo } from 'react';
import { Search, MessageCircleQuestion, Tag } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Input } from '@/components/ui/input';
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import Markdown from 'react-markdown';

type FaqQuestion = {
    id: number;
    titre: string;
    contenu: string;
    tags: string | null;
    visibilite: string;
};

function parseTags(tags: string | null): string[] {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
}

export default function AideFaq({ questions }: { questions: FaqQuestion[] }) {
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const tagFrequency = useMemo(() => {
        const freq: Record<string, number> = {};
        questions.forEach(q => {
            parseTags(q.tags).forEach(tag => {
                freq[tag] = (freq[tag] ?? 0) + 1;
            });
        });
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag]) => tag);
    }, [questions]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return questions.filter(item => {
            const matchSearch = !q
                || item.titre.toLowerCase().includes(q)
                || item.contenu.toLowerCase().includes(q)
                || (item.tags ?? '').toLowerCase().includes(q);
            const matchTag = !activeTag || parseTags(item.tags).includes(activeTag);
            return matchSearch && matchTag;
        });
    }, [questions, search, activeTag]);

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Aide et FAQ</h1>
                <p className="text-sm text-muted-foreground mt-1">Retrouvez les réponses aux questions fréquentes.</p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher une question…"
                    className="pl-9"
                />
            </div>

            {tagFrequency.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Tag className="size-3" /> Tags fréquents :
                    </span>
                    {tagFrequency.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                activeTag === tag
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <MessageCircleQuestion className="size-10 mx-auto mb-3 opacity-40" />
                    <p>{questions.length === 0
                        ? 'Aucune question disponible pour le moment.'
                        : 'Aucune question ne correspond à votre recherche.'
                    }</p>
                </div>
            ) : (
                <Accordion type="multiple" className="space-y-2">
                    {filtered.map(q => (
                        <AccordionItem
                            key={q.id}
                            value={String(q.id)}
                            className="border border-border/60 rounded-xl px-4 bg-card shadow-soft [&>*]:border-b-0"
                        >
                            <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                                <div className="flex items-start gap-2 pr-2 flex-wrap">
                                    <span className="flex-1">{q.titre}</span>
                                    {parseTags(q.tags).map(tag => (
                                        <span
                                            key={tag}
                                            className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0 hidden sm:inline"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="markdown-content text-sm pb-2">
                                    <Markdown>{q.contenu}</Markdown>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
}

AideFaq.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

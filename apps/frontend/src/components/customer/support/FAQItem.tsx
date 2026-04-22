import { useState, useEffect } from 'react';
import { useFAQ } from '../../../hooks/useFAQ';
import { FAQItem as FAQItemType } from '../../../api/faqService';
import { Button } from '../../ui/button';
import { ThumbsUp, ThumbsDown, Eye } from 'lucide-react';

interface FAQItemProps {
  item: FAQItemType;
}

export function FAQItem({ item }: FAQItemProps) {
  const { markFAQHelpful, incrementView } = useFAQ();
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    incrementView(item.id);
  }, [item.id, incrementView]);

  const handleVote = async (isHelpful: boolean) => {
    if (hasVoted) return;
    await markFAQHelpful(item.id, isHelpful);
    setHasVoted(true);
  };

  return (
    <div className="border-b pb-4 last:border-0">
      <h4 className="font-medium mb-2">{item.question}</h4>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{item.answer}</p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {item.views} visualizações
        </div>

        <div className="flex items-center gap-2">
          <span>Esta resposta foi útil?</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleVote(true)}
            disabled={hasVoted}
            className="h-6 px-2"
          >
            <ThumbsUp className="h-3 w-3 mr-1" />
            {item.helpfulYes}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleVote(false)}
            disabled={hasVoted}
            className="h-6 px-2"
          >
            <ThumbsDown className="h-3 w-3 mr-1" />
            {item.helpfulNo}
          </Button>
        </div>
      </div>
    </div>
  );
}

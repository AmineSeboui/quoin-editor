import { englishDiffLabels } from '../../diff/diff-labels';
import { englishAiLabels } from '../../extensions/ai/ai-labels';
import { englishCommentsLabels } from '../../extensions/comments/comments-labels';
import { englishDiagramLabels } from '../../extensions/diagram/diagram-labels';
import { englishEmbedLabels } from '../../extensions/embed/embed-labels';
import { englishEmojiLabels } from '../../extensions/emoji/emoji-labels';
import { englishFindLabels } from '../../extensions/find/find-labels';
import { englishMathLabels } from '../../extensions/math/math-labels';
import { englishMentionLabels } from '../../extensions/mention/mention-labels';
import { englishPresenceLabels } from '../../extensions/presence/presence-labels';
import { englishSourceLabels } from '../../extensions/source/source-labels';
import { englishStatsLabels } from '../../extensions/stats/stats-labels';
import { englishTableLabels } from '../../extensions/table/table-labels';
import { englishTocLabels } from '../../extensions/toc/toc-labels';
import { englishLabels } from '../../i18n/english-labels';

/**
 * The label sets a locale pack covers, each with the suffix its export carries after the language code: the canvas's
 * own set is `frLabels`, the table's `frTableLabels`. Only tests import this; a pack is plain data.
 */
export const LABEL_SETS = [
  { name: 'core', suffix: 'Labels', english: englishLabels },
  { name: 'ai', suffix: 'AiLabels', english: englishAiLabels },
  { name: 'comments', suffix: 'CommentsLabels', english: englishCommentsLabels },
  { name: 'diagram', suffix: 'DiagramLabels', english: englishDiagramLabels },
  { name: 'diff', suffix: 'DiffLabels', english: englishDiffLabels },
  { name: 'embed', suffix: 'EmbedLabels', english: englishEmbedLabels },
  { name: 'emoji', suffix: 'EmojiLabels', english: englishEmojiLabels },
  { name: 'find', suffix: 'FindLabels', english: englishFindLabels },
  { name: 'math', suffix: 'MathLabels', english: englishMathLabels },
  { name: 'mention', suffix: 'MentionLabels', english: englishMentionLabels },
  { name: 'presence', suffix: 'PresenceLabels', english: englishPresenceLabels },
  { name: 'source', suffix: 'SourceLabels', english: englishSourceLabels },
  { name: 'stats', suffix: 'StatsLabels', english: englishStatsLabels },
  { name: 'table', suffix: 'TableLabels', english: englishTableLabels },
  { name: 'toc', suffix: 'TocLabels', english: englishTocLabels },
] as const satisfies readonly { name: string; suffix: string; english: object }[];

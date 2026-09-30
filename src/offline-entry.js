// Entry for the self-contained preview: memo and chunk summaries on this device only (no account, no sync).
import {attachNotes} from './notes.js';
import {attachSummaries} from './summaries.js';
const store=attachNotes({key:'classics-reader-local-notes'});
attachSummaries({store});

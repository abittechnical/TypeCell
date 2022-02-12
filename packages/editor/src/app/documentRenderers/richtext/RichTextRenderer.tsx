import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import DropCursor from "@tiptap/extension-dropcursor";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import GapCursor from "@tiptap/extension-gapcursor";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { observer } from "mobx-react-lite";
import React, { useContext, useEffect, useMemo, useRef } from "react";
import SourceModelCompiler from "../../../runtime/compiler/SourceModelCompiler";
import { MonacoContext } from "../../../runtime/editor/MonacoContext";
import SandboxedExecutionHost from "../../../runtime/executor/executionHosts/sandboxed/SandboxedExecutionHost";
// import LocalExecutionHost from "../../../runtime/executor/executionHosts/local/LocalExecutionHost";
import { DocumentResource } from "../../../store/DocumentResource";
import { getStoreService } from "../../../store/local/stores";
import { UniqueID } from "./extensions/autoid/UniqueID";
import {
  BlockQuoteBlock,
  BulletList,
  CodeBlockBlock,
  HeadingBlock,
  HorizontalRuleBlock,
  IndentItemBlock,
  ListItemBlock,
  OrderedList,
  ParagraphBlock,
  TypeCellNodeBlock,
} from "./extensions/blocktypes";
import ImageBlock from "./extensions/blocktypes/ImageBlock";
import IndentGroup from "./extensions/blocktypes/IndentGroup";
import { TableBlock } from "./extensions/blocktypes/TableBlock";
import { Comments } from "./extensions/comments/Comments";
import { CommentStore } from "./extensions/comments/CommentStore";
import { CommentWrapper } from "./extensions/comments/CommentWrapper";
import { DraggableBlocksExtension } from "./extensions/draggableBlocks/DraggableBlocksExtension";
import { Comment } from "./extensions/marks/Comment";
import Hyperlink from "./extensions/marks/Hyperlink";
import { Underline } from "./extensions/marks/Underline";
import MentionsExtension, { Mention, MentionType } from "./extensions/mentions";
import { MultiSelection } from "./extensions/multiselection/MultiSelection";
import SlashCommandExtension from "./extensions/slashcommand";
import { TrailingNode } from "./extensions/trailingnode";
import { EngineContext } from "./extensions/typecellnode/EngineContext";
import InlineMenu from "./menus/InlineMenu";
import TableMenu from "./menus/TableInlineMenu";
import "./RichTextRenderer.css";
import { blocks } from "./extensions/newblocks";
import { extensions } from "@tiptap/core";
import { DevTools } from "./extensions/devtools/devtools";

// This is a temporary array to show off mentions
const PEOPLE = [
  new Mention("Pepijn Vunderink", MentionType.PEOPLE),
  new Mention("Yousef El-Dardiri", MentionType.PEOPLE),
  new Mention("Chong Zhao", MentionType.PEOPLE),
  new Mention("Matthew Lipski", MentionType.PEOPLE),
  new Mention("Emre Agca", MentionType.PEOPLE),
  new Mention("Nikolay Zhlebinkov", MentionType.PEOPLE),
];

type Props = {
  document: DocumentResource;
};

const RichTextRenderer: React.FC<Props> = observer((props: Props) => {
  const commentStore = new CommentStore(props.document.comments);
  const disposer = useRef<() => void>();
  const monaco = useContext(MonacoContext).monaco;
  const sessionStore = getStoreService().sessionStore;
  const [compiler, executionHost] = useMemo(() => {
    if (disposer.current) {
      disposer.current();
      disposer.current = undefined;
    }
    const newCompiler = new SourceModelCompiler(monaco);
    const newExecutionHost = new SandboxedExecutionHost(
      props.document.id,
      newCompiler,
      monaco
    );
    disposer.current = () => {
      newCompiler.dispose();
      newExecutionHost.dispose();
    };

    return [newCompiler, newExecutionHost];
  }, [props.document.id, monaco]);

  useEffect(() => {
    return () => {
      if (disposer.current) {
        disposer.current();
        disposer.current = undefined;
      }
    };
  }, []);

  const editor = useEditor({
    onUpdate: ({ editor }) => {
      console.log(editor.getJSON());
    },
    extensions: [
      extensions.ClipboardTextSerializer,
      extensions.Commands,
      extensions.Editable,
      extensions.FocusEvents,
      extensions.Tabindex,
      DevTools,
      GapCursor,
      // TODO
      CollaborationCursor.configure({
        provider: props.document.webrtcProvider,
        user: {
          name: sessionStore.loggedInUserId || "Anonymous",
          color: sessionStore.userColor,
        },
      }),
      Collaboration.configure({
        fragment: props.document.data,
      }),
      // DropCursor,
      // Even though we implement our own placeholder logic in Blocks, we
      // still need the placeholder extension to make sure nodeviews
      // are re-rendered when they're empty or when the anchor changes.
      Placeholder.configure({
        placeholder: "placeholder-todo", // actual placeholders are defined per block
        includeChildren: true,
        showOnlyCurrent: false, // use showOnlyCurrent to make sure the nodeviews are rerendered when cursor moves
      }),
      UniqueID.configure({
        types: [
          "paragraph",
          "block",
          "tcblock",
          "bulletList",
          "listItem",
          "heading",
        ],
      }),
      HardBreak,
      Comments,
      // MultiSelection,

      // basics:
      Text,
      // Document,

      // marks:
      Bold,
      Code,
      Italic,
      Strike,
      Underline,
      Comment,
      Hyperlink,

      // custom blocks:
      ...blocks,
      // ImageBlock,
      // BlockQuoteBlock.configure({ placeholder: "Empty quote" }),
      // CodeBlockBlock,
      // HeadingBlock.configure({ placeholder: "Heading" }),
      // HorizontalRuleBlock,
      // ParagraphBlock.configure({
      //   placeholder: "Enter text or type '/' for commands",
      //   placeholderOnlyWhenSelected: true,
      // }),
      // ListItemBlock.configure({ placeholder: "List item" }),
      // TableBlock,
      // IndentItemBlock.configure({
      //   HTMLAttributes: {
      //     class: "indent",
      //   },
      // }),
      // BulletList,
      // OrderedList,

      // custom containers:
      // IndentGroup,

      // from tiptap (unmodified)
      // TableCell,
      // TableHeader,
      // TableRow,
      // TypeCellNodeBlock,
      DraggableBlocksExtension,
      DropCursor.configure({ width: 5, color: "#ddeeff" }),
      // This needs to be at the bottom of this list, because Key events (such as enter, when selecting a /command),
      // should be handled before Enter handlers in other components like splitListItem
      SlashCommandExtension.configure({
        // Extra commands can be registered here
        commands: {},
      }),
      MentionsExtension.configure({
        providers: {
          people: (query) => {
            return PEOPLE.filter((mention) => mention.match(query));
          },
        },
      }),
      // TrailingNode,
    ],
    enableInputRules: true,
    enablePasteRules: true,
    enableCoreExtensions: false,
    editorProps: {
      attributes: {
        class: "editor",
      },
    },
  });

  return (
    <div>
      {editor != null ? (
        <InlineMenu editor={editor} commentStore={commentStore} />
      ) : null}
      {editor != null ? <TableMenu editor={editor} /> : null}
      {editor != null ? (
        <CommentWrapper editor={editor} commentStore={commentStore} />
      ) : null}
      <EngineContext.Provider
        value={{ compiler, executionHost, document: props.document }}>
        <EditorContent editor={editor} />
      </EngineContext.Provider>
    </div>
  );
});

export default RichTextRenderer;

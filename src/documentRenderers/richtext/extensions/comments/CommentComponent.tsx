import React from "react";
import { getMarkRange, getMarkType } from "@tiptap/core";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Avatar from "@atlaskit/avatar";
import Comment, {
  CommentAction,
  CommentAuthor,
  CommentTime,
} from "@atlaskit/comment";
import { CommentStorage, CommentType } from "./CommentStorage";
import { navigationStore, sessionStore } from "../../../../store/local/stores";
import styles from "./Comments.module.css";
import avatarImg from "./defualtAvatar.png";

const commentStorage = new CommentStorage();
const nav = navigationStore;

export const commentComponent = (
  id: number,
  state: EditorState,
  view: EditorView
) => {
  function getComment() {
    const comments: Array<CommentType> = commentStorage.getComments();
    return comments.filter((comment) => comment.id === id)[0];
  }

  function editComment() {
    const oldComments: Array<CommentType> = commentStorage.getComments();
    const oldComment = oldComments.filter((comment) => comment.id === id)[0];
    const newComments = oldComments.filter((comment) => comment.id !== id);
    const newComment: CommentType = {
      id: oldComment.id,
      editable: true,
      comment: oldComment.comment,
      user: oldComment.user,
      date: oldComment.date,
    };
    newComments.push(newComment);
    commentStorage.setComments(newComments);
  }

  function removeComment() {
    // Removes comment from browser cache.
    let comments: Array<CommentType> = commentStorage.getComments();
    comments = comments.filter((comment) => comment.id !== id);
    commentStorage.setComments(comments);

    // Removing corresponding comment mark.
    const tr = state.tr;
    // Iterates over each node.
    state.doc.descendants(function (node, offset) {
      // Iterates over each mark in node.
      for (let mark of node.marks) {
        // Checks that mark is of comment type and has the ID that should be removed.
        if (mark.attrs["id"] !== null && mark.attrs["id"] === id) {
          // Removes comment mark.
          const type = getMarkType("comment", state.schema);
          const range = getMarkRange(state.doc.resolve(offset), type, {
            id: mark.attrs["id"],
          });
          if (typeof range !== "undefined") {
            tr.removeMark(range.from, range.to, mark);
            view.dispatch(tr);
          }
        }
      }
    });
  }

  function getReference() {
    const resolvedPos = state.doc.resolve(state.selection.head);
    const commentType = getMarkType("comment", state.schema);
    const commentRangeWithId = getMarkRange(resolvedPos, commentType, {
      id: id,
    });
    if (typeof commentRangeWithId !== "undefined") {
      return state.doc.cut(commentRangeWithId.from, commentRangeWithId.to)
        .textContent;
    }
  }

  return (
    <div className={styles.comment}>
      <Comment
        avatar={<Avatar src={avatarImg} size="medium" />}
        author={<CommentAuthor>{getComment().user}</CommentAuthor>}
        type={nav.currentPage.owner === getComment().user ? "author" : ""}
        time={<CommentTime>{getComment().date}</CommentTime>}
        content={
          <div>
            <p>{getComment().comment}</p>
            <p className={styles.commentReference}>{getReference()}</p>
          </div>
        }
        actions={[
          <CommentAction onClick={editComment}>Edit</CommentAction>,
          <CommentAction onClick={removeComment}>Delete</CommentAction>,
        ]}
      />
    </div>
  );
};

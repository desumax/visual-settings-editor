/*
 * Copyright 2026 Morphe.
 * https://github.com/MorpheApp/morphe-patches
 *
 * See the included NOTICE file for GPLv3 Section 7 terms that apply to this code.
 */

package app.morphe.extension.youtube.visualeditor;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.text.InputType;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;

/**
 * Shows Morphe's own simple dialogs (a title, a message, up to two inputs and a few buttons) in
 * the editor's design. The native dialog stays open but is made invisible and untouchable; the
 * page draws a copy, and its answers are played back into the native views (typed text, then a
 * click on the real button), so Morphe's own code runs unchanged. Anything that is not simple is
 * left exactly as Morphe shows it, and every failure puts the native dialog back on screen, so the
 * user can never be left with a dialog they cannot see or reach.
 */
final class NativeDialogMirror {

    /** How the page is reached. */
    interface Page {
        /** Show this dialog (JSON below). The page answers through shown(id, handled). */
        void show(int id, String json);

        /** The native dialog of this id is gone (dismissed by its own code): close the page's copy. */
        void closed(int id);
    }

    private static final long CONFIRM_TIMEOUT_MS = 700;
    private static final long AFTER_ACTION_MS = 120;
    private static final long POLL_MS = 250;
    private static final long[] SCAN_DELAYS_MS = {60, 200, 500};

    /** One native dialog that is hidden and drawn by the page instead. */
    private static final class Mirror {
        final int id;
        final View root;
        List<EditText> inputs;
        List<Button> buttons;
        boolean confirmed;
        boolean hidden;
        float alpha;
        int flags;
        float dimAmount;
        int windowAnimations;
        Runnable timeout;

        Mirror(int id, View root) {
            this.id = id;
            this.root = root;
        }
    }

    /** What a dialog's view tree holds, in layout order. */
    private static final class Description {
        final List<String> texts = new ArrayList<>();
        final List<Boolean> textInScroll = new ArrayList<>();
        final List<EditText> inputs = new ArrayList<>();
        final List<Button> buttons = new ArrayList<>();
        boolean complex;
    }

    private final Context context;
    private final Page page;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, Mirror> mirrors = new LinkedHashMap<>();
    // Roots already looked at (mirrored or left alone), so a window is never judged twice.
    private final WeakHashMap<View, Boolean> handled = new WeakHashMap<>();
    // Roots that existed at the last mark(); null until mark() is first called, and until then
    // nothing is mirrored, since every window would otherwise look new (the editor's own included).
    private WeakHashMap<View, Boolean> marked;
    private WeakReference<View> ownRoot = new WeakReference<>(null);
    private int nextId = 1;
    private boolean polling;

    private final Runnable scanTask = this::scan;
    private final Runnable pollTask = this::poll;

    NativeDialogMirror(Context context, Page page) {
        this.context = context;
        this.page = page;
    }

    /** The editor's own window root, never mirrored. May be set later; null is fine. */
    void setOwnRoot(View decor) {
        ownRoot = new WeakReference<>(decor);
    }

    /** Call right before running a Morphe row: remembers which windows exist now. */
    void mark() {
        WeakHashMap<View, Boolean> now = new WeakHashMap<>();
        for (View v : roots()) now.put(v, Boolean.TRUE);
        marked = now;
    }

    /** Call right after running the row: looks now and again a little later, for dialogs opened after a background step. */
    void scanSoon() {
        scan();
        for (long delay : SCAN_DELAYS_MS) handler.postDelayed(scanTask, delay);
    }

    /** One immediate look (also called by the owner when its window loses focus). */
    void scan() {
        if (marked == null) return;
        try {
            for (View root : roots()) {
                if (marked.containsKey(root) || handled.containsKey(root) || root == ownRoot.get()) continue;
                Object lp = root.getLayoutParams();
                // Only plain application windows: toasts, popups and sub-windows are not dialogs.
                if (!(lp instanceof WindowManager.LayoutParams)
                        || ((WindowManager.LayoutParams) lp).type != WindowManager.LayoutParams.TYPE_APPLICATION
                        || root.getVisibility() != View.VISIBLE) continue;
                handled.put(root, Boolean.TRUE);
                Description d = describe(root);
                if (d != null) mirror(root, d);
            }
        } catch (Throwable ignored) {
            // A window we failed to judge is simply left as Morphe shows it.
        }
    }

    /** The page's answer to show(): handled false (or no answer in time) puts the native dialog back. */
    void shown(int id, boolean handledByPage) {
        Mirror m = mirrors.get(id);
        if (m == null) return;
        if (m.timeout != null) handler.removeCallbacks(m.timeout);
        m.timeout = null;
        if (handledByPage) {
            m.confirmed = true;
        } else {
            drop(m);
        }
    }

    /** A page button was pressed: index into the JSON's buttons; inputsJson holds one string per input, or is null. */
    void button(int id, int index, String inputsJson) {
        Mirror m = mirrors.get(id);
        if (m == null || !attached(m.root)) {
            if (m != null) drop(m);
            closed(id);
            return;
        }
        try {
            JSONArray values = inputsJson == null ? null : new JSONArray(inputsJson);
            for (int i = 0; values != null && i < m.inputs.size() && i < values.length(); i++) {
                EditText e = m.inputs.get(i);
                e.setText(values.optString(i, ""));
                try {
                    e.setSelection(e.length());
                } catch (Throwable ignored) {
                    // The cursor position does not matter to Morphe's code.
                }
            }
            if (index < 0 || index >= m.buttons.size()) throw new IndexOutOfBoundsException();
            // Remember the windows now, so a dialog this click opens counts as new.
            mark();
            m.buttons.get(index).performClick();
        } catch (Throwable t) {
            // Could not play the answer back: give the user the native dialog to finish by hand.
            drop(m);
            closed(id);
            return;
        }
        scanSoon();
        handler.postDelayed(() -> afterAction(m), AFTER_ACTION_MS);
    }

    /** The page's copy was dismissed (back, tap outside): cancel the native dialog. */
    void cancel(int id) {
        Mirror m = mirrors.get(id);
        if (m == null) return;
        if (m.timeout != null) handler.removeCallbacks(m.timeout);
        m.timeout = null;
        try {
            // A back press lets the dialog cancel itself the way it normally would.
            long now = SystemClock.uptimeMillis();
            m.root.dispatchKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK, 0));
            m.root.dispatchKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_BACK, 0));
        } catch (Throwable ignored) {
            // The cancel button below, or revealing the dialog, still follows.
        }
        handler.postDelayed(() -> {
            if (mirrors.get(id) != m || goneThenClose(m)) return;
            // Not cancelable by back (or back is handled elsewhere): try its own cancel button.
            Button cancelButton = null;
            try {
                String label = context.getString(android.R.string.cancel);
                for (Button b : m.buttons) {
                    if (b.getText() != null && label.equalsIgnoreCase(b.getText().toString().trim())) {
                        cancelButton = b;
                    }
                }
                if (cancelButton != null) cancelButton.performClick();
            } catch (Throwable ignored) {
                cancelButton = null;
            }
            // No cancel button (or it did nothing): ask the dialog itself, which a back press no longer
            // reaches on Android versions where back is handled by a callback.
            if (cancelButton == null) cancelDialog(m.root);
            handler.postDelayed(() -> {
                if (mirrors.get(id) != m || goneThenClose(m)) return;
                cancelDialog(m.root);
                handler.postDelayed(() -> {
                    if (mirrors.get(id) != m || goneThenClose(m)) return;
                    // Still open: show it as it is, so the user is never stuck behind an invisible dialog.
                    drop(m);
                    closed(id);
                }, AFTER_ACTION_MS);
            }, AFTER_ACTION_MS);
        }, AFTER_ACTION_MS);
    }

    /** The editor is closing: every hidden native dialog gets its look and touch back. */
    void revealAll() {
        handler.removeCallbacksAndMessages(null);
        polling = false;
        for (Mirror m : new ArrayList<>(mirrors.values())) reveal(m);
        mirrors.clear();
    }

    /** True while at least one native dialog is mirrored (hidden) and not yet gone. */
    boolean active() {
        return !mirrors.isEmpty();
    }

    // ---- internals ----

    private void mirror(View root, Description d) {
        Mirror m = new Mirror(nextId++, root);
        m.inputs = d.inputs;
        m.buttons = d.buttons;
        String json = toJson(m.id, d);
        if (json == null || !hide(m)) return;
        mirrors.put(m.id, m);
        // A page that never answers (too old, or broken) must not keep the dialog invisible.
        m.timeout = () -> {
            if (mirrors.get(m.id) == m && !m.confirmed) drop(m);
        };
        handler.postDelayed(m.timeout, CONFIRM_TIMEOUT_MS);
        startPolling();
        try {
            page.show(m.id, json);
        } catch (Throwable t) {
            drop(m);
        }
    }

    /** After a page button: closed if the dialog went away, refreshed if it refused and stays open. */
    private void afterAction(Mirror m) {
        if (mirrors.get(m.id) != m || goneThenClose(m)) return;
        Description d = describe(m.root);
        String json = d == null ? null : toJson(m.id, d);
        if (json == null) {
            // It changed into something the page cannot draw: hand it back to Morphe's look.
            drop(m);
            closed(m.id);
            return;
        }
        m.inputs = d.inputs;
        m.buttons = d.buttons;
        try {
            page.show(m.id, json);
        } catch (Throwable t) {
            drop(m);
        }
    }

    /** Returns true (after telling the page and forgetting it) when the native dialog is gone. */
    private boolean goneThenClose(Mirror m) {
        if (attached(m.root) && m.root.getVisibility() == View.VISIBLE) return false;
        drop(m);
        closed(m.id);
        return true;
    }

    private void startPolling() {
        if (polling) return;
        polling = true;
        handler.postDelayed(pollTask, POLL_MS);
    }

    /** Notices dialogs that Morphe's own code dismissed without any page button. */
    private void poll() {
        for (Mirror m : new ArrayList<>(mirrors.values())) goneThenClose(m);
        polling = false;
        if (!mirrors.isEmpty()) startPolling();
    }

    private void closed(int id) {
        try {
            page.closed(id);
        } catch (Throwable ignored) {
            // The page is closing or broken; nothing native depends on it.
        }
    }

    /** Puts the dialog back as it was and forgets it. */
    private void drop(Mirror m) {
        if (m.timeout != null) handler.removeCallbacks(m.timeout);
        mirrors.remove(m.id);
        reveal(m);
    }

    private boolean hide(Mirror m) {
        try {
            View root = m.root;
            WindowManager.LayoutParams lp = (WindowManager.LayoutParams) root.getLayoutParams();
            m.alpha = root.getAlpha();
            m.flags = lp.flags;
            m.dimAmount = lp.dimAmount;
            m.windowAnimations = lp.windowAnimations;
            m.hidden = true;
            root.setAlpha(0f);
            lp.dimAmount = 0f;
            // Not focusable, so the editor keeps focus and its WebView keeps the keyboard.
            lp.flags = (lp.flags & ~WindowManager.LayoutParams.FLAG_DIM_BEHIND)
                    | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                    | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
            lp.windowAnimations = 0;
            apply(m, lp, true);
            return true;
        } catch (Throwable t) {
            reveal(m);
            return false;
        }
    }

    private void apply(Mirror m, WindowManager.LayoutParams lp, boolean retry) {
        try {
            windowManager().updateViewLayout(m.root, lp);
        } catch (Throwable t) {
            if (retry) {
                // Not attached yet: try once more on the next turn of the main loop.
                handler.post(() -> {
                    if (m.hidden) apply(m, lp, false);
                });
            } else {
                drop(m);
                closed(m.id);
            }
        }
    }

    private void reveal(Mirror m) {
        if (!m.hidden) return;
        m.hidden = false;
        try {
            // The params object is the dialog window's own attributes, so restore it even when the
            // window is gone: a dialog shown again would otherwise come back invisible.
            m.root.setAlpha(m.alpha);
            WindowManager.LayoutParams lp = (WindowManager.LayoutParams) m.root.getLayoutParams();
            lp.flags = m.flags;
            lp.dimAmount = m.dimAmount;
            lp.windowAnimations = m.windowAnimations;
            if (attached(m.root)) windowManager().updateViewLayout(m.root, lp);
        } catch (Throwable ignored) {
            // Nothing more can be done for a window that refuses its own attributes.
        }
    }

    /**
     * Cancels the Dialog a window root belongs to: the root (a DecorView) knows its window, and a
     * dialog is its own window's callback. Not public, so by reflection; does nothing when that fails.
     */
    private static void cancelDialog(View root) {
        try {
            for (Class<?> c = root.getClass(); c != null && c != View.class; c = c.getSuperclass()) {
                Field f;
                try {
                    f = c.getDeclaredField("mWindow");
                } catch (NoSuchFieldException e) {
                    continue;
                }
                f.setAccessible(true);
                Object w = f.get(root);
                if (w instanceof android.view.Window) {
                    Object callback = ((android.view.Window) w).getCallback();
                    if (callback instanceof android.app.Dialog) ((android.app.Dialog) callback).cancel();
                }
                return;
            }
        } catch (Throwable ignored) {
            // The caller reveals the dialog if it is still there.
        }
    }

    private WindowManager windowManager() {
        return (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
    }

    private static boolean attached(View v) {
        return v.getWindowToken() != null;
    }

    /** Every window root of the app, read the way test frameworks do; empty on any failure. */
    private static List<View> roots() {
        List<View> out = new ArrayList<>();
        try {
            Class<?> global = Class.forName("android.view.WindowManagerGlobal");
            Object instance = global.getMethod("getInstance").invoke(null);
            Field field = global.getDeclaredField("mViews");
            field.setAccessible(true);
            Object views = field.get(instance);
            if (views instanceof List) {
                for (Object o : new ArrayList<>((List<?>) views)) if (o instanceof View) out.add((View) o);
            } else if (views instanceof View[]) {
                for (View v : (View[]) views) if (v != null) out.add(v);
            }
        } catch (Throwable ignored) {
            out.clear();
        }
        return out;
    }

    /** The dialog's contents, or null when it is not simple enough for the page to draw. */
    private static Description describe(View root) {
        try {
            Description d = new Description();
            walk(root, d, false);
            if (d.complex || d.buttons.isEmpty() || d.buttons.size() > 3 || d.inputs.size() > 2
                    || (d.texts.isEmpty() && d.inputs.isEmpty())) return null;
            return d;
        } catch (Throwable t) {
            return null;
        }
    }

    private static void walk(View v, Description d, boolean inScroll) {
        if (d.complex || v.getVisibility() != View.VISIBLE) return;
        if (v instanceof AdapterView || v instanceof CompoundButton || v instanceof ProgressBar
                || v instanceof WebView || isRecycler(v)) {
            d.complex = true;
        } else if (v instanceof EditText) {
            d.inputs.add((EditText) v);
        } else if (v instanceof Button) {
            CharSequence label = ((Button) v).getText();
            if (label == null || label.toString().trim().isEmpty()) {
                d.complex = true; // An icon button the page cannot draw.
            } else {
                d.buttons.add((Button) v);
            }
        } else if (v instanceof TextView) {
            if (v.hasOnClickListeners()) {
                d.complex = true;
                return;
            }
            CharSequence text = ((TextView) v).getText();
            if (text != null && !text.toString().trim().isEmpty()) {
                d.texts.add(text.toString());
                d.textInScroll.add(inScroll);
            }
        } else if (v instanceof ImageView) {
            if (v.isClickable()) d.complex = true; // A plain image is decoration.
        } else if (v instanceof ViewGroup) {
            if (v.hasOnClickListeners()) {
                d.complex = true;
                return;
            }
            ViewGroup g = (ViewGroup) v;
            boolean scroll = inScroll || v instanceof ScrollView;
            for (int i = 0; i < g.getChildCount(); i++) walk(g.getChildAt(i), d, scroll);
        } else if (v.getClass() != View.class && !(v instanceof android.widget.Space)) {
            d.complex = true; // A custom view; only a plain View or a Space (divider, spacer) is ignored.
        }
    }

    private static boolean isRecycler(View v) {
        for (Class<?> c = v.getClass(); c != null; c = c.getSuperclass()) {
            if (c.getName().contains("RecyclerView")) return true;
        }
        return false;
    }

    private static String toJson(int id, Description d) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", id);
            // The first text is the title, unless it sits in the scrolling message area (a dialog
            // with a message but no title).
            int first = 0;
            String title = "";
            if (!d.texts.isEmpty() && !d.textInScroll.get(0)) {
                title = d.texts.get(0);
                first = 1;
            }
            o.put("title", title);
            JSONArray texts = new JSONArray();
            for (int i = first; i < d.texts.size(); i++) texts.put(d.texts.get(i));
            o.put("texts", texts);
            JSONArray inputs = new JSONArray();
            for (EditText e : d.inputs) {
                int type = e.getInputType();
                CharSequence hint = e.getHint();
                inputs.put(new JSONObject()
                        .put("value", e.getText() == null ? "" : e.getText().toString())
                        .put("hint", hint == null ? "" : hint.toString())
                        .put("multi", (type & InputType.TYPE_TEXT_FLAG_MULTI_LINE) != 0)
                        .put("number", (type & InputType.TYPE_MASK_CLASS) == InputType.TYPE_CLASS_NUMBER));
            }
            o.put("inputs", inputs);
            JSONArray buttons = new JSONArray();
            // Morphe's dialogs put their buttons in one row as Neutral, Cancel, OK, and when those do not
            // fit, one under the other as OK, Cancel, Neutral, each in a row of its own. So the main
            // action is the last button of a shared row, and the first one otherwise.
            int last = d.buttons.size() - 1;
            int main = last == 0 || d.buttons.get(0).getParent() == d.buttons.get(last).getParent() ? last : 0;
            for (int i = 0; i <= last; i++) {
                buttons.put(new JSONObject()
                        .put("label", d.buttons.get(i).getText().toString())
                        .put("primary", i == main));
            }
            o.put("buttons", buttons);
            return o.toString();
        } catch (Throwable t) {
            return null;
        }
    }
}

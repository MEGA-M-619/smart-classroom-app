import { Modal } from "./ui.jsx";
import { COLORS } from "./theme.js";

const field = { fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" };

export function ClassActionModals(props) {
  const {
    user, classes, selected,
    joinModal, setJoinModal, joinCode, setJoinCode, joinClass,
    submitModal, setSubmitModal, submitFile, setSubmitFile, submitAssignment,
    showCreateClass, setShowCreateClass, createClassForm, setCreateClassForm, createClass,
    showCreateAsgn, setShowCreateAsgn, asgnForm, setAsgnForm, createAssignment,
    showUpload, setShowUpload, uploadForm, setUploadForm, uploadMaterial,
    showPostAnn, setShowPostAnn, annForm, setAnnForm, createAnnouncement,
  } = props;

  const teacherClasses = classes.filter((c) => c.teacherId === user.id);
  const classId = selected || asgnForm.classId || annForm.classId || uploadForm.classId || teacherClasses[0]?.id;

  return (
    <>
      {joinModal && (
        <Modal title="Join a Class" onClose={() => setJoinModal(false)}>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 16 }}>Enter the class code from your instructor.</p>
          <input className="sca-input" placeholder="e.g. WEB301" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ marginBottom: 16, textAlign: "center" }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="sca-btn sca-btn-ghost" style={{ flex: 1 }} onClick={() => setJoinModal(false)}>Cancel</button>
            <button type="button" className="sca-btn sca-btn-primary" style={{ flex: 1 }} onClick={async () => { await joinClass(joinCode); setJoinModal(false); setJoinCode(""); }}>Join Class</button>
          </div>
        </Modal>
      )}

      {submitModal && (
        <Modal title={`Submit — ${submitModal.title}`} onClose={() => setSubmitModal(null)}>
          <input type="file" className="sca-input" onChange={(e) => setSubmitFile(e.target.files?.[0] || null)} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>Or submit without a file (uses a placeholder filename).</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="sca-btn sca-btn-ghost" style={{ flex: 1 }} onClick={() => setSubmitModal(null)}>Cancel</button>
            <button type="button" className="sca-btn sca-btn-primary" style={{ flex: 1 }} onClick={async () => {
              await submitAssignment(submitModal.id, submitFile, submitFile?.name || `${submitModal.title.replace(/\s+/g, "_")}.zip`);
              setSubmitModal(null); setSubmitFile(null);
            }}>Submit</button>
          </div>
        </Modal>
      )}

      {showCreateClass && (
        <Modal title="Create New Class" onClose={() => setShowCreateClass(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={field}>Class Name *</label><input className="sca-input" value={createClassForm.name} onChange={(e) => setCreateClassForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><label style={field}>Description</label><textarea className="sca-input" rows={3} value={createClassForm.description} onChange={(e) => setCreateClassForm((f) => ({ ...f, description: e.target.value }))} style={{ resize: "none" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={field}>Schedule</label><input className="sca-input" value={createClassForm.schedule} onChange={(e) => setCreateClassForm((f) => ({ ...f, schedule: e.target.value }))} /></div>
              <div><label style={field}>Room</label><input className="sca-input" value={createClassForm.room} onChange={(e) => setCreateClassForm((f) => ({ ...f, room: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="sca-btn sca-btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreateClass(false)}>Cancel</button>
              <button type="button" className="sca-btn sca-btn-primary" style={{ flex: 1 }} onClick={async () => {
                if (!createClassForm.name?.trim()) return alert("Class name is required");
                await createClass(createClassForm);
                setShowCreateClass(false);
                setCreateClassForm({ name: "", description: "", schedule: "", room: "" });
              }}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {showCreateAsgn && (
        <Modal title="Create Assignment / Quiz" onClose={() => setShowCreateAsgn(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={field}>Class</label>
              <select className="sca-input" value={asgnForm.classId || classId || ""} onChange={(e) => setAsgnForm((f) => ({ ...f, classId: Number(e.target.value) }))}>
                {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={field}>Title *</label><input className="sca-input" value={asgnForm.title} onChange={(e) => setAsgnForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div><label style={field}>Description</label><textarea className="sca-input" rows={3} value={asgnForm.description} onChange={(e) => setAsgnForm((f) => ({ ...f, description: e.target.value }))} style={{ resize: "none" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={field}>Due Date *</label><input className="sca-input" type="date" value={asgnForm.dueDate} onChange={(e) => setAsgnForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
              <div><label style={field}>Points</label><input className="sca-input" type="number" value={asgnForm.points} onChange={(e) => setAsgnForm((f) => ({ ...f, points: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <label style={field}>Type</label>
              <select className="sca-input" value={asgnForm.type} onChange={(e) => setAsgnForm((f) => ({ ...f, type: e.target.value }))}>
                {["Assignment", "Project", "Lab", "Quiz"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="sca-btn sca-btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreateAsgn(false)}>Cancel</button>
              <button type="button" className="sca-btn sca-btn-primary" style={{ flex: 1 }} onClick={async () => {
                if (!asgnForm.title?.trim() || !asgnForm.dueDate) return alert("Title and due date are required");
                await createAssignment({ ...asgnForm, classId: Number(asgnForm.classId || classId) });
                setShowCreateAsgn(false);
                setAsgnForm({ title: "", description: "", dueDate: "", points: 100, type: "Assignment", classId: classId || "" });
              }}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {showUpload && (
        <Modal title="Upload Material" onClose={() => setShowUpload(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={field}>Class</label>
              <select className="sca-input" value={uploadForm.classId || classId || ""} onChange={(e) => setUploadForm((f) => ({ ...f, classId: Number(e.target.value) }))}>
                {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={field}>Title</label><input className="sca-input" value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <label style={field}>Type</label>
              <select className="sca-input" value={uploadForm.type} onChange={(e) => setUploadForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="pdf">PDF</option><option value="slides">Slides</option><option value="zip">ZIP</option>
              </select>
            </div>
            <div><label style={field}>File</label><input type="file" className="sca-input" onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="sca-btn sca-btn-ghost" style={{ flex: 1 }} onClick={() => setShowUpload(false)}>Cancel</button>
              <button type="button" className="sca-btn sca-btn-primary" style={{ flex: 1 }} onClick={async () => {
                const cid = Number(uploadForm.classId || classId);
                await uploadMaterial(cid, uploadForm.title || uploadForm.file?.name || "Material", uploadForm.type, uploadForm.file);
                setShowUpload(false);
                setUploadForm({ title: "", type: "pdf", file: null, classId: cid });
              }}>Upload</button>
            </div>
          </div>
        </Modal>
      )}

      {showPostAnn && (
        <Modal title="Post Announcement" onClose={() => setShowPostAnn(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={field}>Class</label>
              <select className="sca-input" value={annForm.classId || classId || ""} onChange={(e) => setAnnForm((f) => ({ ...f, classId: Number(e.target.value) }))}>
                {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={field}>Title *</label><input className="sca-input" value={annForm.title} onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div><label style={field}>Message *</label><textarea className="sca-input" rows={4} value={annForm.body} onChange={(e) => setAnnForm((f) => ({ ...f, body: e.target.value }))} style={{ resize: "none" }} /></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={annForm.pinned} onChange={(e) => setAnnForm((f) => ({ ...f, pinned: e.target.checked }))} /> Pin this announcement</label>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="sca-btn sca-btn-ghost" style={{ flex: 1 }} onClick={() => setShowPostAnn(false)}>Cancel</button>
              <button type="button" className="sca-btn sca-btn-primary" style={{ flex: 1 }} onClick={async () => {
                if (!annForm.title?.trim() || !annForm.body?.trim()) return alert("Title and message are required");
                await createAnnouncement({ classId: Number(annForm.classId || classId), title: annForm.title, body: annForm.body, pinned: annForm.pinned });
                setShowPostAnn(false);
                setAnnForm({ title: "", body: "", pinned: false, classId: classId || "" });
              }}>Post</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

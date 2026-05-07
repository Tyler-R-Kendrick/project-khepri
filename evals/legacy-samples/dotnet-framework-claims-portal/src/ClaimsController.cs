using System.Web.Mvc;

namespace Legacy.ClaimsPortal.Controllers
{
    public sealed class ClaimsController : Controller
    {
        public ActionResult Details(string id)
        {
            var status = ClaimGateway.LookupStatus(id);
            return Json(new { claimId = id, status }, JsonRequestBehavior.AllowGet);
        }
    }
}

using System;
using System.ServiceProcess;

namespace Legacy.ClaimsPortal.Services
{
    public sealed class ClaimSweepService : ServiceBase
    {
        protected override void OnStart(string[] args)
        {
            // Legacy Windows service schedule: 02:15 local time, single retry.
            LegacySweepScheduler.Schedule(TimeSpan.FromHours(2) + TimeSpan.FromMinutes(15), retryCount: 1);
        }
    }
}

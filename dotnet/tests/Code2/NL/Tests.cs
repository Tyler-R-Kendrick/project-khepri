using Khepri.Code2NL;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Khepri.Code2NL.Tests;

[TestClass]
public sealed class Tests
{
    [TestMethod]
    public void ProgramTypeIsAvailable()
    {
        Assert.IsNotNull(typeof(Program));
    }
}

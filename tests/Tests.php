<?php
/**
 * The Tests Class
 *
 * This file contains the test class file used for TestRunner.php
 * @author Aaron Saray
 */

namespace FirePHP4Chrome;


require __DIR__ . '/vendor/autoload.php';

/**
 * The Tests Class
 *
 * This contains the tests and loads the required FirePHP Core when necessary.
 */
class Tests implements \Iterator
{
	/**
	 * @var array the test array - corresponds to methods in this class
	 */
	protected $_tests = array(
		'LogMessage',
		'InfoMessage',
		'WarnMessage',
		'ErrorMessage',
		'ExceptionAsError',
		'GroupExpanded',
		'GroupCollapsed',
		'Table',
		'Trace',
		'MultipleHeadersProperOrder',
		'MultilineHeaderMessage',
		'Issue20'
	);

	/**
	 * @var int current position in the iterator
	 */
	protected $_iteratorKey = 0;

	/*********************************************************
	 * These are the tests that are ran for firephp4chrome
	 ********************************************************/

	/**
	 * Tests sending a log message
	 */
	protected function _testLogMessage()
	{
		\FB::log('This is a log message with no label');
		\FB::log('This is a log message with a label', 'Here is the label');

		$providerData = $this->_provideItemsForLogging();
		\FB::log($providerData['array'], 'this is the label to an array');
		\FB::log($providerData['object'], 'this is the label for the object');
	}

	/**
	 * Test for sending info message
	 */
	protected function _testInfoMessage()
	{
		\FB::info('This is an info message with no label');
		\FB::info('This is an info message with a label', 'this is the label');

		$providerData = $this->_provideItemsForLogging();
		\FB::info($providerData['array'], 'this is the label to an array');
		\FB::info($providerData['object'], 'this is the label for the object');
	}

	/**
	 * Used to test warn messages
	 */
	protected function _testWarnMessage()
	{
		\FB::warn('This is a warn message with no label');
		\FB::warn('This is a warn message with a label', 'here is the label');

		$providerData = $this->_provideItemsForLogging();
		\FB::warn($providerData['array'], 'this is the label to an array');
		\FB::warn($providerData['object'], 'this is the label for the object');
	}

	/**
	 * Tests error messages
	 */
	protected function _testErrorMessage()
	{
		\FB::error('This is an error message with no label');
		\FB::error('This is an error message with a label', 'this is the label');

		$providerData = $this->_provideItemsForLogging();
		\FB::error($providerData['array'], 'this is the label to an array');
		\FB::error($providerData['object'], 'this is the label for the object');
	}

	/**
	 * Throw an exception, and then catch it, and send it to the error handler
	 */
	protected function _testExceptionAsError()
	{
		try {
			throw new \Exception('This is my test exception message.');
		}
		catch (\Exception $e) {
			\FB::error($e);
			\FB::error($e, 'This is the label');
		}
	}

	/**
	 * tests the expanded group
	 */
	protected function _testGroupExpanded()
	{
		\FB::group('Group start');
		\FB::info('here is something to be grouped');
		\FB::info('here is more to be grouped');
		\FB::groupEnd();
	}

	/**
	 * tests the collapsed group
	 */
	protected function _testGroupCollapsed()
	{
		\FB::group('Group start of collapsed', array('Collapsed'=>true));
		\FB::info('here is something to be grouped');
		\FB::info('here is more to be grouped');
		\FB::groupEnd();
	}

	/**
	 * Tests the table display
	 */
	protected function _testTable()
	{
		$table = array();
		$table[] = array('column 1', 'column2', 'column 3');
		$table[] = array('1x1', '1x2', '1x3');
		$table[] = array('2x1', '2x2', '2x3');
		$table[] = array('3x1', '3x2', '3x3');

		\FB::table('Table label is here', $table);
	}

	/**
	 * Tests the output of the trace command
	 */
	protected function _testTrace()
	{
		\FB::trace('this is the label of the trace');
	}

	/**
	 * test a lot of headers to make sure that the ordering is working properly
	 */
	protected function _testMultipleHeadersProperOrder()
	{
		$counter = range(1, 22);
		foreach ($counter as $key) {
			\FB::info("This is header #{$key}");
		}
	}

	/**
	 * used to test messages that require multiple headers to make one message
	 */
	protected function _testMultilineHeaderMessage()
	{
		$item = array_fill(0, 600, array());
		foreach ($item as $key=> &$array) {
			$array["{$key} test string"] = md5(uniqid());
		}
		\FB::log($item);
	}

	/**
	 * A specific message is not parsed properly
	 * @see https://github.com/aaronsaray/FirePHP4Chrome/issues/20
	 */
	protected function _testIssue20()
	{
		\FB::log('test line 1');
		\FB::log('test line 2');

		/**
		 * The header message pasted was: X-Wf-1-1-1-3:120|[{"Type":"INFO","File":"","Line":"","Label":"app"},"#^https?:\/\/(?<city>[^\\.]+)\\.___domain___\/(actions|afisha)\/?#"]|
		 * Reverse engineered that regular expression (although I think the op is missing a period in their domain
		 */
		$regEx = "#^https?://(?<city>[^\.]+)\.___domain___/(actions|afisha)/?#";
		\FB::log($regEx);
	}

	/**********************************************************
	 * end of test functions
	 *********************************************************/

	/**
	 * Runs the test based on the passed in ID
	 *
	 * @param $id the identifier from the tests array
	 * @throws \Exception when the test is not found
	 * @return string the method that is being ran
	 */
	public function run($id)
	{
		if (!isset($this->_tests[$id])) {
			throw new \Exception("The ID of [{$id}] is not a valid test ID.");
		}

		$methodName = '_test' . $this->_tests[$id];
		if (!method_exists($this, $methodName)) {
			throw new \Exception("This class does not contain the method: [{$methodName}]");
		}

		$this->$methodName();

		return "Ran test: {$this->_tests[$id]}";
	}

	/**
	 * This method returns items for testing for the various logging methods
	 *
	 * @return array items for testing
	 */
	protected function _provideItemsForLogging()
	{
		$array = range(1,5);
		$array = array('hi there'=>'my guy');
		$object = new \stdClass;
		$object->meaningOfLife = 42;
		return array('array'=>$array, 'object'=>$object);
	}



	/***************************************************************
	 * The following functions are used for the iterator interface
	 **************************************************************/

	/**
	 * Rewind array - used for iterator
	 */
	public function rewind()
	{
		$this->_iteratorKey = 0;
	}

	/**
	 * @return mixed the current item for the iterator
	 */
	public function current()
	{
		return $this->_tests[$this->_iteratorKey];
	}

	/**
	 * @return string the current position - for iterator
	 */
	public function key()
	{
		return $this->_iteratorKey;
	}

	/**
	 * increments the iterator key
	 */
	public function next()
	{
		$this->_iteratorKey++;
	}

	/**
	 * @return bool returns if this is a valid key or not
	 */
	public function valid()
	{
		return isset($this->_tests[$this->_iteratorKey]);
	}
}

